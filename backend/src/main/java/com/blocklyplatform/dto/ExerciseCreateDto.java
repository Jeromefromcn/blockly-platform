package com.blocklyplatform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ExerciseCreateDto {
    @NotBlank
    private String code;
    @NotBlank
    private String title;
    @NotBlank
    private String description;
    @NotBlank
    private String blocklyState;
    @NotBlank
    private String expectedOutput;
    private String gradingMode = "OUTPUT_MATCH";
    private String allowedBlocks;
    private String createdBy;
}
