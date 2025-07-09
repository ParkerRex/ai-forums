# Add Helpful Comments

You are an AI assistant tasked with adding comprehensive, helpful comments to code files or folders to improve code readability and maintainability.

Your goal is to analyze the provided files/folders and add meaningful comments that help both humans and LLMs understand the code better, following best practices for each language.

You will be given file or folder paths to analyze and comment:
<files_or_folders>
#$ARGUMENTS
</files_or_folders>

Follow these steps to complete the task systematically:

1. **Analyze the codebase**:
   - Examine the file structure and identify file types
   - Read through the code to understand the overall architecture, patterns, and complexity
   - Identify existing commenting patterns and style conventions
   - Look for any existing documentation standards (JSDoc, TSDoc, docstrings, etc.)
   - Determine the appropriate commenting density based on code complexity

2. **Research commenting best practices**:
   - Identify the correct documentation format for each file type (TSDoc for TypeScript, JSDoc for JavaScript, docstrings for Python, etc.)
   - Review existing comments in the codebase to match the established style
   - Look for any project-specific commenting guidelines in README, CONTRIBUTING.md, or similar files

3. **Present a plan**:
   - Based on your analysis, outline a plan for adding comments to the code
   - Specify the commenting approach for each file type and complexity level
   - Include the commenting standards you'll follow and estimated comment density
   - Present this plan in `<plan>` tags

4. **Add comments systematically**:
   - Once the plan is approved, add comments to the specified files
   - Follow the 2:1 comment-to-code ratio guideline, adjusting based on complexity
   - Add function/method documentation with parameters, return values, and examples where helpful
   - Include inline comments for complex logic, algorithms, or non-obvious code sections
   - Add file-level comments explaining the module's purpose and main exports
   - Ensure comments are written for junior to mid-level engineers to quickly understand the code

5. **Verify and finalize**:
   - Review all added comments for accuracy, clarity, and consistency
   - Ensure comments follow the established patterns and documentation standards
   - Check that comments add value and don't state the obvious
   - Validate that all complex functions have proper documentation

## Commenting Standards by Language:

### TypeScript/JavaScript:
- Use TSDoc/JSDoc format for functions and classes
- Include `@param`, `@returns`, `@throws`, `@example` tags as appropriate
- Add file-level documentation explaining the module's purpose

### Python:
- Use docstrings following PEP 257 conventions
- Include parameter types, return types, and examples
- Add module-level docstrings

### Other Languages:
- Follow language-specific documentation conventions
- Maintain consistency with existing codebase patterns

## Comment Quality Guidelines:
- Comments should explain **why** something is done, not just **what** is done
- Focus on business logic, algorithms, and non-obvious implementation details
- Include context that helps with debugging and maintenance
- Avoid comments that simply restate the code
- Write comments that will be helpful for code reviews and onboarding

Remember to think carefully about the code structure and write comments that provide genuine value to developers who will maintain this code in the future.
