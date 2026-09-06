extends Node
## Autoload: defines the default keyboard bindings in code instead of the
## project.godot InputMap section, so the bindings never depend on
## hand-written key-code numbers. These exist purely for desktop testing —
## the shipped mobile controls are the on-screen joystick and buttons
## (virtual_joystick.gd, action_button.gd), which drive the same actions.

func _ready() -> void:
	_bind("move_forward", KEY_W)
	_bind("move_back", KEY_S)
	_bind("move_left", KEY_A)
	_bind("move_right", KEY_D)
	_bind("jump", KEY_SPACE)
	_bind("ability_1", KEY_E)


func _bind(action: StringName, keycode: Key) -> void:
	if not InputMap.has_action(action):
		InputMap.add_action(action)

	for event in InputMap.action_get_events(action):
		if event is InputEventKey and event.physical_keycode == keycode:
			return

	var key_event := InputEventKey.new()
	key_event.physical_keycode = keycode
	InputMap.action_add_event(action, key_event)
