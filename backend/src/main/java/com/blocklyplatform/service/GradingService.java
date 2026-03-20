package com.blocklyplatform.service;

import com.blocklyplatform.dto.SubmitDto;
import com.blocklyplatform.entity.*;
import com.blocklyplatform.repository.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

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

    @Value("${sandbox.url}")
    private String sandboxUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public Map<String, Object> submit(SubmitDto dto) {
        Exercise ex = exerciseRepo.findByIdAndDeletedAtIsNull(dto.getExerciseId())
                .orElseThrow(() -> new RuntimeException("Exercise not found"));

        if (!"PUBLISHED".equals(ex.getStatus()))
            throw new RuntimeException("Exercise is not published");

        ExerciseVersion version = versionRepo
                .findByExerciseIdAndVersionNumber(ex.getId(), ex.getCurrentVersionNumber())
                .orElseThrow(() -> new RuntimeException("Version not found"));

        // Save submission
        Submission submission = new Submission();
        submission.setExercise(ex);
        submission.setVersionNumber(version.getVersionNumber());
        submission.setStudentName(dto.getStudentName());
        submission.setBlocklyState(dto.getBlocklyState());
        submission.setGeneratedCode(dto.getGeneratedCode());
        submissionRepo.save(submission);

        // Execute code in sandbox
        String actualOutput = executeInSandbox(dto.getGeneratedCode());

        // Grade
        Grade grade = computeGrade(submission, version, dto.getBlocklyState(), actualOutput);
        gradeRepo.save(grade);

        return buildResult(submission, grade, version);
    }

    @Transactional
    public Map<String, Object> overrideGrade(Long submissionId, Integer tutorScore, String tutorComment) {
        Grade grade = gradeRepo.findBySubmissionId(submissionId)
                .orElseThrow(() -> new RuntimeException("Grade not found"));
        grade.setTutorScore(tutorScore);
        grade.setTutorComment(tutorComment);
        gradeRepo.save(grade);
        return Map.of(
                "submissionId", submissionId,
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
            m.put("versionNumber", s.getVersionNumber());
            m.put("submittedAt", s.getSubmittedAt());
            gradeRepo.findBySubmissionId(s.getId()).ifPresent(g -> {
                m.put("autoScore", g.getAutoScore());
                m.put("tutorScore", g.getTutorScore());
                m.put("actualOutput", g.getActualOutput());
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
        m.put("versionNumber", s.getVersionNumber());
        m.put("blocklyState", s.getBlocklyState());
        m.put("submittedAt", s.getSubmittedAt());
        if (grade != null) {
            m.put("autoScore", grade.getAutoScore());
            m.put("executionScore", grade.getExecutionScore());
            m.put("structureScore", grade.getStructureScore());
            m.put("complexityScore", grade.getComplexityScore());
            m.put("actualOutput", grade.getActualOutput());
            m.put("tutorScore", grade.getTutorScore());
            m.put("tutorComment", grade.getTutorComment());
        }
        return m;
    }

    // ── Sandbox ───────────────────────────────────────────────────────────────

    private String executeInSandbox(String code) {
        try {
            Map<String, Object> body = Map.of("code", code, "timeout", 10);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            ResponseEntity<Map> response = restTemplate.exchange(
                    sandboxUrl + "/execute",
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    Map.class
            );
            if (response.getBody() != null) {
                return String.valueOf(response.getBody().getOrDefault("stdout", ""));
            }
        } catch (Exception e) {
            log.error("Sandbox execution failed: {}", e.getMessage());
        }
        return "";
    }

    // ── Grading ───────────────────────────────────────────────────────────────

    private Grade computeGrade(Submission submission, ExerciseVersion version,
                                String blocklyState, String actualOutput) {
        Grade grade = new Grade();
        grade.setSubmission(submission);
        grade.setActualOutput(actualOutput);

        int execScore = scoreExecution(actualOutput, version.getExpectedOutput());
        int structScore = scoreStructure(blocklyState, version.getBlocklyState());
        int complexScore = scoreComplexity(blocklyState);

        grade.setExecutionScore(execScore);
        grade.setStructureScore(structScore);
        grade.setComplexityScore(complexScore);
        grade.setAutoScore(execScore + structScore + complexScore);

        return grade;
    }

    /** Layer 1: Execution result — 40 pts */
    private int scoreExecution(String actual, String expected) {
        String a = normalize(actual);
        String e = normalize(expected);
        if (a.equals(e)) return 40;
        if (a.isEmpty()) return 0;

        String[] aLines = a.split("\n");
        String[] eLines = e.split("\n");
        long correct = 0;
        for (int i = 0; i < Math.min(aLines.length, eLines.length); i++) {
            if (aLines[i].equals(eLines[i])) correct++;
        }
        return (int)(40.0 * correct / Math.max(1, eLines.length));
    }

    /** Layer 2: Block structure comparison — 30 pts */
    private int scoreStructure(String studentState, String expectedState) {
        try {
            Map<String, Integer> studentTypes = extractBlockTypes(studentState);
            Map<String, Integer> expectedTypes = extractBlockTypes(expectedState);

            if (expectedTypes.isEmpty()) return 15; // no reference, give partial score

            int matched = 0, total = 0;
            for (Map.Entry<String, Integer> e : expectedTypes.entrySet()) {
                total += e.getValue();
                matched += Math.min(studentTypes.getOrDefault(e.getKey(), 0), e.getValue());
            }
            return total == 0 ? 0 : (int)(30.0 * matched / total);
        } catch (Exception e) {
            return 0;
        }
    }

    /** Layer 3: Logic complexity — 30 pts */
    private int scoreComplexity(String blocklyState) {
        try {
            Map<String, Integer> types = extractBlockTypes(blocklyState);
            int totalBlocks = types.values().stream().mapToInt(Integer::intValue).sum();

            if (totalBlocks == 0) return 0;

            boolean hasLogic = types.keySet().stream()
                    .anyMatch(t -> t.contains("if") || t.contains("loop") ||
                            t.contains("while") || t.contains("for") ||
                            t.contains("controls") || t.contains("logic"));
            if (!hasLogic && totalBlocks < 3) return 0; // hardcoded answer check

            int score = 0;
            if (totalBlocks >= 3) score += 10;
            if (hasLogic) score += 10;
            if (totalBlocks >= 5 && totalBlocks <= 40) score += 10;
            return score;
        } catch (Exception e) {
            return 0;
        }
    }

    private Map<String, Integer> extractBlockTypes(String blocklyState) {
        Map<String, Integer> types = new HashMap<>();
        try {
            JsonNode root = objectMapper.readTree(blocklyState);
            JsonNode blocks = root.path("blocks").path("blocks");
            if (blocks.isArray()) {
                collectTypes(blocks, types);
            }
        } catch (Exception ignored) {}
        return types;
    }

    private void collectTypes(JsonNode blocks, Map<String, Integer> types) {
        for (JsonNode block : blocks) {
            String type = block.path("type").asText();
            if (!type.isEmpty()) {
                types.merge(type, 1, Integer::sum);
            }
            // recurse into inputs
            JsonNode inputs = block.path("inputs");
            if (inputs.isObject()) {
                inputs.forEach(input -> {
                    JsonNode inner = input.path("block");
                    if (inner.isObject()) {
                        collectTypes(objectMapper.createArrayNode().add(inner), types);
                    }
                });
            }
            // recurse into next
            JsonNode next = block.path("next").path("block");
            if (next.isObject()) {
                collectTypes(objectMapper.createArrayNode().add(next), types);
            }
        }
    }

    private String normalize(String s) {
        if (s == null) return "";
        return s.trim().replaceAll("\\r\\n", "\n").replaceAll("\\r", "\n")
                .replaceAll("[ \\t]+$", "").replaceAll("(?m)[ \\t]+$", "");
    }

    private Map<String, Object> buildResult(Submission submission, Grade grade,
                                             ExerciseVersion version) {
        return Map.of(
                "submissionId", submission.getId(),
                "autoScore", grade.getAutoScore(),
                "executionScore", grade.getExecutionScore(),
                "structureScore", grade.getStructureScore(),
                "complexityScore", grade.getComplexityScore(),
                "actualOutput", grade.getActualOutput() != null ? grade.getActualOutput() : "",
                "expectedOutput", version.getExpectedOutput()
        );
    }
}
