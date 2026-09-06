extends CharacterBody3D
## Third-person controller for a touch-first mobile game: the on-screen
## joystick (virtual_joystick.gd) drives movement, dragging anywhere else on
## screen orbits the camera, and an on-screen button casts the starter
## ability. Desktop testing works the same way with a mouse (click-drag to
## look, WASD/Space/E as a keyboard fallback — see input_setup.gd).

const WALK_SPEED := 4.0
const RUN_SPEED := 7.5
const JUMP_VELOCITY := 4.8
const LOOK_SENSITIVITY := 0.006
const TURN_SPEED := 10.0
const PITCH_MIN := deg_to_rad(-60)
const PITCH_MAX := deg_to_rad(20)
const CAST_COOLDOWN := 0.5

const FIRE_BOLT_SCENE := preload("res://scenes/fire_bolt.tscn")

@onready var camera_pivot: Node3D = $CameraPivot
@onready var spring_arm: SpringArm3D = $CameraPivot/SpringArm3D
@onready var mesh: MeshInstance3D = $MeshInstance3D

var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")
var _mouse_look_active := false
var _cast_timer := 0.0


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventScreenDrag:
		_rotate_look(event.relative)
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		_mouse_look_active = event.pressed
	elif event is InputEventMouseMotion and _mouse_look_active:
		_rotate_look(event.relative)


func _rotate_look(relative: Vector2) -> void:
	camera_pivot.rotation.y -= relative.x * LOOK_SENSITIVITY
	spring_arm.rotation.x = clamp(
		spring_arm.rotation.x - relative.y * LOOK_SENSITIVITY,
		PITCH_MIN,
		PITCH_MAX
	)


func _physics_process(delta: float) -> void:
	_cast_timer = max(_cast_timer - delta, 0.0)

	if not is_on_floor():
		velocity.y -= gravity * delta

	if Input.is_action_just_pressed("jump") and is_on_floor():
		velocity.y = JUMP_VELOCITY

	if Input.is_action_just_pressed("ability_1") and _cast_timer <= 0.0:
		_cast_fire_bolt()
		_cast_timer = CAST_COOLDOWN

	var input_dir := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var forward_basis := camera_pivot.global_transform.basis
	var direction := forward_basis * Vector3(input_dir.x, 0.0, input_dir.y)
	direction.y = 0.0
	direction = direction.normalized()

	# Joystick tilt amount doubles as the walk/run blend — no separate
	# sprint control is needed on a touchscreen with only one thumb free.
	var speed := lerp(WALK_SPEED, RUN_SPEED, clamp(input_dir.length(), 0.0, 1.0))

	if direction.length_squared() > 0.001:
		velocity.x = direction.x * speed
		velocity.z = direction.z * speed
		var target_angle := atan2(direction.x, direction.z)
		mesh.rotation.y = lerp_angle(mesh.rotation.y, target_angle, TURN_SPEED * delta)
	else:
		velocity.x = move_toward(velocity.x, 0.0, speed)
		velocity.z = move_toward(velocity.z, 0.0, speed)

	move_and_slide()


func _cast_fire_bolt() -> void:
	var bolt := FIRE_BOLT_SCENE.instantiate()
	get_tree().current_scene.add_child(bolt)
	var spawn_transform := spring_arm.global_transform
	spawn_transform.origin = global_transform.origin + Vector3.UP * 1.2 - spawn_transform.basis.z * 1.0
	bolt.global_transform = spawn_transform
