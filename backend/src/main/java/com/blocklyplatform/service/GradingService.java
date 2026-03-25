package com.blocklyplatform.service;

import com.blocklyplatform.entity.*;
import com.blocklyplatform.repository.*;
import com.blocklyplatform.util.ByteArrayMultipartFile;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
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
    private final AutoGradingService autoGradingService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Batch import student answer JSON files.
     * Each file must contain: { "exerciseId": n, "blocklyState": {...}, "studentName": "..." }
     * Optionally: { "generatedCode": "..." } for auto-grading.
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
                String generatedCode = root.path("generatedCode").isMissingNode() ? null
                        : root.path("generatedCode").asText(null);

                Exercise ex = exerciseRepo.findByIdAndDeletedAtIsNull(exerciseId)
                        .orElseThrow(() -> new RuntimeException("Exercise not found: id=" + exerciseId));

                int versionNumber = ex.getCurrentVersionNumber();

                Submission submission = new Submission();
                submission.setExercise(ex);
                submission.setVersionNumber(versionNumber);
                submission.setStudentName(studentName);
                submission.setSourceFilename(filename);
                submission.setBlocklyState(blocklyStateStr);
                if (generatedCode != null) submission.setGeneratedCode(generatedCode);
                submissionRepo.save(submission);

                Map<String, Object> r = new HashMap<>();
                r.put("filename", filename);
                r.put("submissionId", submission.getId());
                r.put("status", "imported");

                // Auto-grade if generatedCode is present
                if (generatedCode != null && !generatedCode.isBlank()) {
                    try {
                        ExerciseVersion version = versionRepo
                                .findByExerciseIdAndVersionNumber(exerciseId, versionNumber)
                                .orElse(null);
                        if (version != null) {
                            String gradingMode = version.getGradingMode();
                            String expectedOutput = version.getExpectedOutput();
                            int autoScore = autoGradingService.grade(generatedCode, gradingMode, expectedOutput);

                            Grade grade = gradeRepo.findBySubmissionId(submission.getId()).orElse(new Grade());
                            grade.setSubmission(submission);
                            grade.setAutoScore(autoScore);
                            gradeRepo.save(grade);

                            r.put("autoScore", autoScore);
                        }
                    } catch (Exception e) {
                        log.warn("Auto-grading failed for file {}: {}", filename, e.getMessage());
                    }
                }

                results.add(r);

            } catch (Exception e) {
                log.error("Failed to import file {}: {}", filename, e.getMessage());
                results.add(Map.of("filename", filename, "status", "error", "message", e.getMessage()));
            }
        }
        return results;
    }

    @Transactional
    public List<Map<String, Object>> batchImportZip(MultipartFile zipFile) throws Exception {
        List<MultipartFile> files = new ArrayList<>();
        try (java.util.zip.ZipInputStream zis = new java.util.zip.ZipInputStream(zipFile.getInputStream())) {
            java.util.zip.ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (entry.getName().endsWith(".json")) {
                    byte[] bytes = zis.readAllBytes();
                    String entryName = entry.getName();
                    // Use only the filename part, not the full path inside the ZIP
                    String filename = entryName.contains("/")
                            ? entryName.substring(entryName.lastIndexOf('/') + 1)
                            : entryName;
                    files.add(new ByteArrayMultipartFile(filename, filename, "application/json", bytes));
                }
                zis.closeEntry();
            }
        }
        return batchImport(files);
    }

    public byte[] exportGradesCsv(Long exerciseId) throws Exception {
        List<Map<String, Object>> submissions = listSubmissions(exerciseId);
        try (java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
             java.io.OutputStreamWriter writer = new java.io.OutputStreamWriter(baos, StandardCharsets.UTF_8);
             org.apache.commons.csv.CSVPrinter printer = new org.apache.commons.csv.CSVPrinter(writer,
                     org.apache.commons.csv.CSVFormat.DEFAULT.withHeader(
                             "Student Name", "Exercise", "Auto Score", "Tutor Score", "Comment", "Submitted At"))) {
            for (Map<String, Object> s : submissions) {
                printer.printRecord(
                        s.get("studentName"),
                        s.get("exerciseTitle"),
                        s.getOrDefault("autoScore", ""),
                        s.getOrDefault("tutorScore", ""),
                        s.getOrDefault("tutorComment", ""),
                        s.get("submittedAt")
                );
            }
            printer.flush();
            return baos.toByteArray();
        }
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
                m.put("autoScore", g.getAutoScore());
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
        m.put("generatedCode", s.getGeneratedCode());
        m.put("submittedAt", s.getSubmittedAt());
        if (grade != null) {
            m.put("tutorScore", grade.getTutorScore());
            m.put("autoScore", grade.getAutoScore());
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
