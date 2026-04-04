package com.blocklyplatform.service;

import com.blocklyplatform.entity.Category;
import com.blocklyplatform.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public List<Category> listAll() {
        return categoryRepository.findAllByOrderByName();
    }
}
