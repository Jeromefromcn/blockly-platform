package com.blocklyplatform.controller;

import com.blocklyplatform.service.GradingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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

    /**
     * Batch import from a ZIP archive containing JSON files.
     */
    @PostMapping("/submissions/import-zip")
    public ResponseEntity<?> batchImportZip(@RequestParam("file") MultipartFile zipFile) {
        try {
            return ResponseEntity.ok(gradingService.batchImportZip(zipFile));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Export grades as CSV. Pass exerciseId to filter, omit for all submissions.
     */
    @GetMapping("/submissions/export-csv")
    public ResponseEntity<byte[]> exportCsv(@RequestParam(required = false) Long exerciseId) {
        try {
            byte[] csvBytes = gradingService.exportGradesCsv(exerciseId);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
            headers.setContentDispositionFormData("attachment", "grades.csv");
            return ResponseEntity.ok().headers(headers).body(csvBytes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
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
