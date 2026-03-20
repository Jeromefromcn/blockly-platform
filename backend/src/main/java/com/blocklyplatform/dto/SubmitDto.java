package com.blocklyplatform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SubmitDto {
    @NotNull
    private Long exerciseId;
    @NotBlank
    private String studentName;
    @NotBlank
    private String blocklyState;
    @NotBlank
    private String generatedCode;
}
