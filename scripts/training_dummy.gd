extends StaticBody3D
## Simple hit-reactive target: flashes white and does a small scale punch
## when it takes damage, so casting the starter ability has immediate,
## visible feedback even with no real art or enemy AI yet.

@onready var mesh: MeshInstance3D = $MeshInstance3D

var health := 100.0
var _material: StandardMaterial3D
var _base_color: Color


func _ready() -> void:
	_material = mesh.get_surface_override_material(0)
	_base_color = _material.albedo_color


func take_damage(amount: float) -> void:
	health -= amount
	_flash()
	if health <= 0.0:
		queue_free()


func _flash() -> void:
	_material.albedo_color = Color(1, 1, 1)
	var tween := create_tween()
	tween.tween_property(mesh, "scale", Vector3.ONE * 0.85, 0.05)
	tween.tween_property(mesh, "scale", Vector3.ONE, 0.15)
	tween.parallel().tween_property(_material, "albedo_color", _base_color, 0.2)
