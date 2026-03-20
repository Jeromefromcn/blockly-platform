package com.blocklyplatform.service;

import com.blocklyplatform.entity.*;
import com.blocklyplatform.repository.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GradingService {

    private final ExerciseRepository exerciseRepo;
    private final ExerciseVersionRepository versionRepo;
    private final SubmissionRepository submissionRepo;
    private final GradeRepository gradeRepo;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Batch import student answer JSON files.
     * Each file must contain: { "exerciseId": n, "blocklyState": {...}, "studentName": "..." }
     */
    @Transactional
    public List<Map<String, Object>> batchImport(List<MultipartFile> files) {
        List<Map<String, Object>> results = new ArrayList<>();

        for (MultipartFile file : files) {
            String filename = Objects.requireNonNull(file.getOriginalFilename(), "unnamed.json");
            try {
                JsonNode root = objectMapper.readTree(file.getBytes());
                long exerciseId = root.path("exerciseId").asLong();
                String blocklyStateStr = objectMapper.writeValueAsString(root.path("blocklyState"));
                String studentName = root.path("studentName").asText(null);

                Exercise ex = exerciseRepo.findByIdAndDeletedAtIsNull(exerciseId)
                        .orElseThrow(() -> new RuntimeException("Exercise not found: id=" + exerciseId));

                int versionNumber = ex.getCurrentVersionNumber();

                Submission submission = new Submission();
                submission.setExercise(ex);
                submission.setVersionNumber(versionNumber);
                submission.setStudentName(studentName);
                submission.setSourceFilename(filename);
                submission.setBlocklyState(blocklyStateStr);
                submissionRepo.save(submission);

                Map<String, Object> r = new HashMap<>();
                r.put("filename", filename);
                r.put("submissionId", submission.getId());
                r.put("status", "imported");
                results.add(r);

            } catch (Exception e) {
                log.error("Failed to import file {}: {}", filename, e.getMessage());
                results.add(Map.of("filename", filename, "status", "error", "message", e.getMessage()));
            }
        }
        return results;
    }

    @Transactional
    public Map<String, Object> grade(Long submissionId, Integer tutorScore, String tutorComment) {
        Submission submission = submissionRepo.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Submission not found"));

        Grade grade = gradeRepo.findBySubmissionId(submissionId).orElse(new Grade());
        grade.setSubmission(submission);
        grade.setTutorScore(tutorScore);
        grade.setTutorComment(tutorComment);
        gradeRepo.save(grade);

        return Map.of(
                "submissionId", submissionId,
                "sourceFilename", submission.getSourceFilename(),
                "tutorScore", tutorScore,
                "tutorComment", tutorComment != null ? tutorComment : ""
        );
    }

    public List<Map<String, Object>> listSubmissions(Long exerciseId) {
        List<Submission> submissions = exerciseId != null
                ? submissionRepo.findByExerciseIdAndDeletedAtIsNullOrderBySubmittedAtDesc(exerciseId)
                : submissionRepo.findByDeletedAtIsNullOrderBySubmittedAtDesc();

        return submissions.stream().map(s -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", s.getId());
            m.put("exerciseId", s.getExercise().getId());
            m.put("exerciseTitle", s.getExercise().getTitle());
            m.put("studentName", s.getStudentName());
            m.put("sourceFilename", s.getSourceFilename());
            m.put("versionNumber", s.getVersionNumber());
            m.put("submittedAt", s.getSubmittedAt());
            gradeRepo.findBySubmissionId(s.getId()).ifPresent(g -> {
                m.put("tutorScore", g.getTutorScore());
                m.put("tutorComment", g.getTutorComment());
                m.put("gradedAt", g.getGradedAt());
            });
            return m;
        }).collect(Collectors.toList());
    }

    public Map<String, Object> getSubmissionDetail(Long submissionId) {
        Submission s = submissionRepo.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Submission not found"));
        Grade grade = gradeRepo.findBySubmissionId(submissionId).orElse(null);

        Map<String, Object> m = new HashMap<>();
        m.put("id", s.getId());
        m.put("exerciseId", s.getExercise().getId());
        m.put("exerciseTitle", s.getExercise().getTitle());
        m.put("studentName", s.getStudentName());
        m.put("sourceFilename", s.getSourceFilename());
        m.put("versionNumber", s.getVersionNumber());
        m.put("blocklyState", s.getBlocklyState());
        m.put("submittedAt", s.getSubmittedAt());
        if (grade != null) {
            m.put("tutorScore", grade.getTutorScore());
            m.put("tutorComment", grade.getTutorComment());
            m.put("gradedAt", grade.getGradedAt());
        }
        return m;
    }

    @Transactional
    public void deleteSubmission(Long id) {
        Submission s = submissionRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Submission not found"));
        s.setDeletedAt(LocalDateTime.now());
        submissionRepo.save(s);
    }
}
