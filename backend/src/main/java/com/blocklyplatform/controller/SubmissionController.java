package com.blocklyplatform.controller;

import com.blocklyplatform.dto.GradeOverrideDto;
import com.blocklyplatform.dto.SubmitDto;
import com.blocklyplatform.service.GradingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SubmissionController {

    private final GradingService gradingService;

    @PostMapping("/submissions")
    public ResponseEntity<?> submit(@Valid @RequestBody SubmitDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(gradingService.submit(dto));
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
    public ResponseEntity<?> overrideGrade(@PathVariable Long id,
                                            @RequestBody GradeOverrideDto dto) {
        return ResponseEntity.ok(gradingService.overrideGrade(id, dto.getTutorScore(), dto.getTutorComment()));
    }
}
