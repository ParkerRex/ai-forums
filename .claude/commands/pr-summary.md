# GitHub PR Comment Template Instructions

Generate a comprehensive PR comment following this exact structure:

## 1. Title Format
Start with: `# [Action] [Feature/Component] with [Key Capabilities]`

Example: `# Implement comprehensive calendar page with event management and Google Calendar integration`

## 2. Summary Section
Begin with `## Summary` followed by a brief introduction paragraph explaining what the PR introduces, then use bullet points with **bold headers** for major features:

```markdown
## Summary

This PR introduces [brief description of the feature]. The implementation includes:

- **[Feature Category]**: [Description of what was added/changed]
- **[Feature Category]**: [Description with specific capabilities mentioned]
- **[Feature Category]**: [Technical details or integration points]
```

## 3. Review & Testing Checklist
Create a section titled `## Review & Testing Checklist for Human` with:
- An introductory line about the complexity and testing requirements
- Checkboxes for different testing areas
- A **Recommended Test Plan** in bold with specific testing steps

```markdown
## Review & Testing Checklist for Human

This is a [complexity level] feature that requires thorough testing. Please verify:

- [ ] **[Test Category]**: [Specific things to test]
- [ ] **[Test Category]**: [Edge cases and scenarios to verify]
- [ ] **[Authentication/Security]**: [Security-related tests]
- [ ] **[UI/UX]**: [Interface and responsiveness tests]
- [ ] **[Error Handling]**: [Error scenarios to test]

**Recommended Test Plan**: [Specific step-by-step testing instructions]
```

## 4. Mermaid Diagram
Include a visual representation of the changes using a Mermaid diagram:

```markdown
### Diagram

```mermaid
%%{ init : { "theme" : "default" }}%%
graph TB
    subgraph "[Component Group]"
        [ComponentName]["path/to/file.ext"]:::edit-level
    end
    
    [Component1] --> [Component2]
    
    subgraph Legend
        L1["Major Edit"]:::major-edit
        L2["Minor Edit"]:::minor-edit
        L3["Context/No Edit"]:::context
    end

    classDef major-edit fill:#90EE90
    classDef minor-edit fill:#87CEEB
    classDef context fill:#FFFFFF
```
```

## 5. Notes Section
End with a `### Notes` section containing:
- **Testing Status**: What has been tested
- **Future Enhancements**: What's prepared but not fully implemented
- **Performance**: Any performance considerations or optimizations
- **Screenshots**: If UI changes, include Playwright screenshot links or placeholders

```markdown
### Notes

- **Testing Status**: [What was tested and how]
- **Future Enhancements**: [Features prepared but not implemented]
- **Performance**: [Performance considerations]
- **Screenshots**: [Description of UI changes with links/placeholders]
```

## Additional Guidelines:
1. Use clear, technical language appropriate for developers
2. Group related changes together logically
3. Highlight breaking changes or important considerations
4. For the diagram, use appropriate edit levels:
   - `major-edit` (green) for new files or significant changes
   - `minor-edit` (blue) for small modifications
   - `context` (white) for files shown for context only
5. Make the testing checklist actionable and specific to the changes
6. Include both positive and negative test scenarios
7. If the PR involves UI changes, always mention the need for visual testing

## Example Keywords to Use:
- "comprehensive", "full CRUD", "integration prep"
- "groundwork for", "support for", "capabilities"
- "responsive design", "mobile-friendly"
- "error handling", "edge cases", "validation"
- "authenticated/unauthenticated users"