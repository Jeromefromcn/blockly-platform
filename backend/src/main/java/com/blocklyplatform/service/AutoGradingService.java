package com.blocklyplatform.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.mozilla.javascript.*;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class AutoGradingService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Auto-grade a submission by executing JS code against test cases.
     * @param jsCode Generated JavaScript code from Blockly
     * @param gradingMode "OUTPUT_MATCH" or "TRACE_MATCH"
     * @param expectedOutputJson JSON string of expected output
     * @return score 0-100
     */
    public int grade(String jsCode, String gradingMode, String expectedOutputJson) {
        try {
            if ("OUTPUT_MATCH".equals(gradingMode)) {
                return gradeOutputMatch(jsCode, expectedOutputJson);
            } else if ("TRACE_MATCH".equals(gradingMode)) {
                return gradeTraceMatch(jsCode, expectedOutputJson);
            }
        } catch (Exception e) {
            log.warn("Auto-grading failed: {}", e.getMessage());
        }
        return 0;
    }

    private int gradeOutputMatch(String jsCode, String expectedOutputJson) throws Exception {
        JsonNode testCases = objectMapper.readTree(expectedOutputJson);
        if (!testCases.isArray() || testCases.size() == 0) return 0;

        int passed = 0;
        for (JsonNode tc : testCases) {
            String input = tc.path("input").asText("");
            String expected = tc.path("expected").asText("");
            String result = executeJs(jsCode + "\n" + input, 3000);
            if (expected.equals(result.trim())) passed++;
        }
        return (int) Math.round(100.0 * passed / testCases.size());
    }

    private int gradeTraceMatch(String jsCode, String expectedOutputJson) throws Exception {
        JsonNode expectedTrace = objectMapper.readTree(expectedOutputJson);
        if (!expectedTrace.isArray()) return 0;

        // Execute with trace collection
        List<String> capturedTrace = new ArrayList<>();
        String traceCode = "var __trace = [];\n" + jsCode;
        String output = executeJs(traceCode + "\nJSON.stringify(__trace)", 3000);

        JsonNode actualTrace = objectMapper.readTree(output);
        if (!actualTrace.isArray()) return 0;

        int matched = 0;
        int total = expectedTrace.size();
        for (int i = 0; i < total && i < actualTrace.size(); i++) {
            if (expectedTrace.get(i).asText().equals(actualTrace.get(i).asText())) matched++;
        }
        return total == 0 ? 0 : (int) Math.round(100.0 * matched / total);
    }

    private String executeJs(String code, long timeoutMs) {
        Context cx = Context.enter();
        try {
            cx.setOptimizationLevel(-1);
            cx.setLanguageVersion(Context.VERSION_ES6);

            Scriptable scope = cx.initSafeStandardObjects();

            // Capture print/console output
            StringBuilder output = new StringBuilder();
            ScriptableObject.putProperty(scope, "print", new BaseFunction() {
                @Override
                public Object call(Context cx, Scriptable scope, Scriptable thisObj, Object[] args) {
                    for (Object arg : args) output.append(Context.toString(arg));
                    return Undefined.instance;
                }
            });

            Object result = cx.evaluateString(scope, code, "<grading>", 1, null);
            if (result != null && result != Undefined.instance) {
                return Context.toString(result);
            }
            return output.toString();
        } finally {
            Context.exit();
        }
    }
}
