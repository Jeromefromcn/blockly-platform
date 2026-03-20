package com.blocklyplatform.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "submissions")
public class Submission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "student_name")
    private String studentName;

    @Column(name = "source_filename", nullable = false)
    private String sourceFilename;

    @Column(name = "blockly_state", nullable = false, columnDefinition = "TEXT")
    private String blocklyState;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @PrePersist
    protected void onCreate() {
        submittedAt = LocalDateTime.now();
    }
}
