package com.blocklyplatform.controller;

import com.blocklyplatform.dto.ExerciseCreateDto;
import com.blocklyplatform.service.CategoryService;
import com.blocklyplatform.service.ExerciseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/exercises")
@RequiredArgsConstructor
public class ExerciseController {

    private final ExerciseService exerciseService;
    private final CategoryService categoryService;

    @GetMapping("/published")
    public ResponseEntity<?> listPublished(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String difficulty) {
        if (category != null || difficulty != null) {
            return ResponseEntity.ok(exerciseService.listPublishedFiltered(category, difficulty));
        }
        return ResponseEntity.ok(exerciseService.listPublished());
    }

    @GetMapping("/categories")
    public ResponseEntity<?> listCategories() {
        return ResponseEntity.ok(categoryService.listAll());
    }

    @GetMapping
    public ResponseEntity<?> listAll() {
        return ResponseEntity.ok(exerciseService.listAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id) {
        return ResponseEntity.ok(exerciseService.getWithVersion(id));
    }

    @GetMapping("/{id}/versions")
    public ResponseEntity<?> versions(@PathVariable Long id) {
        return ResponseEntity.ok(exerciseService.listVersions(id));
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody ExerciseCreateDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(exerciseService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @Valid @RequestBody ExerciseCreateDto dto) {
        return ResponseEntity.ok(exerciseService.update(id, dto));
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<?> publish(@PathVariable Long id) {
        return ResponseEntity.ok(exerciseService.publish(id));
    }

    @PostMapping("/{id}/unpublish")
    public ResponseEntity<?> unpublish(@PathVariable Long id) {
        return ResponseEntity.ok(exerciseService.unpublish(id));
    }

    @PostMapping("/{id}/rollback/{versionNumber}")
    public ResponseEntity<?> rollback(@PathVariable Long id, @PathVariable Integer versionNumber) {
        return ResponseEntity.ok(exerciseService.rollback(id, versionNumber));
    }

    @PostMapping("/{id}/like")
    public ResponseEntity<?> like(@PathVariable Long id, @RequestParam String clientId) {
        return ResponseEntity.ok(exerciseService.like(id, clientId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        exerciseService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }
}
