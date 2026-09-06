extends Area3D
## Starter magic ability: a bolt that flies forward, deals damage to
## anything with a take_damage() method, and disappears on impact or after
## its lifetime runs out.

const SPEED := 14.0
const LIFETIME := 3.0
const DAMAGE := 25.0

var _age := 0.0


func _ready() -> void:
	body_entered.connect(_on_body_entered)


func _physics_process(delta: float) -> void:
	_age += delta
	if _age >= LIFETIME:
		queue_free()
		return
	global_translate(-global_transform.basis.z * SPEED * delta)


func _on_body_entered(body: Node3D) -> void:
	if body.has_method("take_damage"):
		body.take_damage(DAMAGE)
	queue_free()
