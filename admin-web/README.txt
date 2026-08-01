REGISTER CHOICE — FULL 45/55 VERSION

Desktop:
- Exact 45% left blue panel
- Exact 55% right content panel
- Diagonal blue visual overlap
- Workshop background on the right
- Register Choice card remains readable

Mobile/tablet:
- No workshop background
- No floating negative-margin card because floatingCard={false}
- Normal content flow below the blue header

Install:
1. Replace src/components/auth/AuthSplitLayout.tsx
2. Replace src/pages/auth/RegisterChoice.tsx
3. Ensure public/auth/workshop-login-background.png exists
4. Run npm run build
