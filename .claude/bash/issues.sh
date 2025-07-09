gh issue list | head -5 | xargs -I {} claude --dangerously-skip-permissions /work-on-issue {}
