package com.blocklyplatform.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AutoGradingServiceTest {

    private AutoGradingService service;

    @BeforeEach
    void setUp() {
        service = new AutoGradingService();
    }

    // 1. OUTPUT_MATCH with correct answer -> 100
    @Test
    void outputMatch_correctAnswer_returns100() {
        String jsCode = "function add(a, b) { return a + b; }";
        String expectedJson = "[{\"input\": \"add(1,2)\", \"expected\": \"3\"}]";
        int score = service.grade(jsCode, "OUTPUT_MATCH", expectedJson);
        assertEquals(100, score);
    }

    // 2. OUTPUT_MATCH with wrong answer -> 0
    @Test
    void outputMatch_wrongAnswer_returns0() {
        String jsCode = "function add(a, b) { return a - b; }";
        String expectedJson = "[{\"input\": \"add(1,2)\", \"expected\": \"3\"}]";
        int score = service.grade(jsCode, "OUTPUT_MATCH", expectedJson);
        assertEquals(0, score);
    }

    // 3. OUTPUT_MATCH with multiple test cases, half correct -> 50
    @Test
    void outputMatch_halfCorrect_returns50() {
        String jsCode = "function add(a, b) { return a + b; }";
        // First test case correct, second uses a function that doesn't exist -> wrong
        String expectedJson = "[" +
                "{\"input\": \"add(1,2)\", \"expected\": \"3\"}," +
                "{\"input\": \"add(5,10)\", \"expected\": \"999\"}" +
                "]";
        int score = service.grade(jsCode, "OUTPUT_MATCH", expectedJson);
        assertEquals(50, score);
    }

    // 4. TRACE_MATCH with correct trace -> 100
    @Test
    void traceMatch_correctTrace_returns100() {
        String jsCode = "__trace.push('step1'); __trace.push('step2');";
        String expectedJson = "[\"step1\", \"step2\"]";
        int score = service.grade(jsCode, "TRACE_MATCH", expectedJson);
        assertEquals(100, score);
    }

    // 5. TRACE_MATCH with wrong trace -> 0
    @Test
    void traceMatch_wrongTrace_returns0() {
        String jsCode = "__trace.push('stepX'); __trace.push('stepY');";
        String expectedJson = "[\"step1\", \"step2\"]";
        int score = service.grade(jsCode, "TRACE_MATCH", expectedJson);
        assertEquals(0, score);
    }

    // 6. grade() with invalid JS -> 0 (no exception thrown)
    @Test
    void grade_invalidJs_returns0NoException() {
        String jsCode = "this is not valid javascript!!!";
        String expectedJson = "[{\"input\": \"add(1,2)\", \"expected\": \"3\"}]";
        int score = assertDoesNotThrow(() -> service.grade(jsCode, "OUTPUT_MATCH", expectedJson));
        assertEquals(0, score);
    }

    // 7. grade() with null/empty expectedOutput -> 0
    @Test
    void grade_emptyExpectedOutput_returns0() {
        String jsCode = "function add(a, b) { return a + b; }";
        int score = service.grade(jsCode, "OUTPUT_MATCH", "[]");
        assertEquals(0, score);
    }

    @Test
    void grade_nullExpectedOutput_returns0() {
        String jsCode = "function add(a, b) { return a + b; }";
        int score = assertDoesNotThrow(() -> service.grade(jsCode, "OUTPUT_MATCH", null));
        assertEquals(0, score);
    }
}
