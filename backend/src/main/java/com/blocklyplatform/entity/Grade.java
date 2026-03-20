package com.blocklyplatform.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "grades")
public class Grade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id", nullable = false)
    private Submission submission;

    @Column(name = "tutor_score")
    private Integer tutorScore;

    @Column(name = "tutor_comment", columnDefinition = "TEXT")
    private String tutorComment;

    @Column(name = "graded_at")
    private LocalDateTime gradedAt;

    @PrePersist
    protected void onCreate() {
        gradedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        gradedAt = LocalDateTime.now();
    }
}
