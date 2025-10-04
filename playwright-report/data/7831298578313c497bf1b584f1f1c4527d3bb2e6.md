# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - img [ref=e5]
    - generic [ref=e7]:
      - img "Background" [ref=e9]
      - generic [ref=e12]:
        - generic [ref=e13]:
          - heading "Welcome to Zeke" [level=1] [ref=e14]
          - paragraph [ref=e15]: New here or coming back? Choose how you want to continue
        - generic [ref=e16]:
          - button "Continue with Google" [ref=e18] [cursor=pointer]:
            - generic [ref=e20] [cursor=pointer]:
              - img [ref=e21] [cursor=pointer]
              - generic [ref=e27] [cursor=pointer]: Continue with Google
          - generic [ref=e29]: Or
          - heading "Other options" [level=3] [ref=e32]:
            - button "Other options" [ref=e33] [cursor=pointer]:
              - generic [ref=e34] [cursor=pointer]: Other options
              - img [ref=e35] [cursor=pointer]
        - paragraph [ref=e38]:
          - text: By signing in you agree to our
          - link "Terms of service" [ref=e39] [cursor=pointer]:
            - /url: https://zekehq.com/terms
          - text: "&"
          - link "Privacy policy" [ref=e40] [cursor=pointer]:
            - /url: https://zekehq.com/policy
    - generic [ref=e41]:
      - generic [ref=e42]: This site uses tracking technologies. You may opt in or opt out of the use of these technologies.
      - generic [ref=e43]:
        - button "Deny" [ref=e44] [cursor=pointer]
        - button "Accept" [ref=e45] [cursor=pointer]
  - region "Notifications (F8)":
    - list
  - alert [ref=e46]
```