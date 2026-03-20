package com.blocklyplatform.controller;

import com.blocklyplatform.service.GradingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SubmissionController {

    private final GradingService gradingService;

    /**
     * Batch import student answer JSON files.
     * Each file: { "exerciseId": n, "studentName": "...", "blocklyState": {...} }
     */
    @PostMapping("/submissions/import")
    public ResponseEntity<?> batchImport(@RequestParam("files") List<MultipartFile> files) {
        return ResponseEntity.ok(gradingService.batchImport(files));
    }

    @GetMapping("/submissions")
    public ResponseEntity<?> list(@RequestParam(required = false) Long exerciseId) {
        return ResponseEntity.ok(gradingService.listSubmissions(exerciseId));
    }

    @GetMapping("/submissions/{id}")
    public ResponseEntity<?> detail(@PathVariable Long id) {
        return ResponseEntity.ok(gradingService.getSubmissionDetail(id));
    }

    @PatchMapping("/submissions/{id}/grade")
    public ResponseEntity<?> grade(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Integer score = body.get("tutorScore") != null ? (Integer) body.get("tutorScore") : null;
        String comment = body.get("tutorComment") != null ? body.get("tutorComment").toString() : null;
        return ResponseEntity.ok(gradingService.grade(id, score, comment));
    }

    @DeleteMapping("/submissions/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        gradingService.deleteSubmission(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }
}
