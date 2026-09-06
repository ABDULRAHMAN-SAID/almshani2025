extends Control
## On-screen analog joystick (bottom-left, movement only). Drives the same
## move_* input actions used by the keyboard, so gameplay code never needs
## to know which input source produced them. Also accepts a mouse drag
## starting inside its area, so it can be tested with a mouse in the editor.

const KNOB_RADIUS := 90.0
const DEAD_ZONE := 0.15

var _active := false
var _touch_index := -1
var _origin := Vector2.ZERO
var _knob_offset := Vector2.ZERO


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func _draw() -> void:
	var center := size / 2.0
	draw_circle(center, KNOB_RADIUS, Color(1, 1, 1, 0.15))
	draw_circle(center + _knob_offset, KNOB_RADIUS * 0.4, Color(1, 1, 1, 0.35))


func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed and not _active and get_global_rect().has_point(event.position):
			_start(event.position, event.index)
		elif not event.pressed and _active and event.index == _touch_index:
			_stop()
	elif event is InputEventScreenDrag and _active and event.index == _touch_index:
		_update(event.position)
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed and not _active and get_global_rect().has_point(event.position):
			_start(event.position, -1)
		elif not event.pressed and _active and _touch_index == -1:
			_stop()
	elif event is InputEventMouseMotion and _active and _touch_index == -1:
		_update(event.position)


func _start(pointer_position: Vector2, index: int) -> void:
	_active = true
	_touch_index = index
	_origin = pointer_position
	_update(pointer_position)
	get_viewport().set_input_as_handled()


func _stop() -> void:
	_active = false
	_knob_offset = Vector2.ZERO
	queue_redraw()
	_apply(Vector2.ZERO)
	get_viewport().set_input_as_handled()


func _update(pointer_position: Vector2) -> void:
	var offset := (pointer_position - _origin).limit_length(KNOB_RADIUS)
	_knob_offset = offset
	queue_redraw()
	_apply(offset / KNOB_RADIUS)
	get_viewport().set_input_as_handled()


func _apply(v: Vector2) -> void:
	if v.length() < DEAD_ZONE:
		v = Vector2.ZERO
	_axis("move_right", "move_left", v.x)
	_axis("move_back", "move_forward", v.y)


func _axis(positive_action: StringName, negative_action: StringName, value: float) -> void:
	if value > 0.0:
		Input.action_release(negative_action)
		Input.action_press(positive_action, value)
	elif value < 0.0:
		Input.action_release(positive_action)
		Input.action_press(negative_action, -value)
	else:
		Input.action_release(positive_action)
		Input.action_release(negative_action)
