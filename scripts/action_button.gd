extends Button
## Connects a UI button to press/release a named input action, so a
## touch/mouse tap behaves exactly like holding down the equivalent key.

@export var action_name: StringName = &""


func _ready() -> void:
	button_down.connect(func() -> void: Input.action_press(action_name))
	button_up.connect(func() -> void: Input.action_release(action_name))
