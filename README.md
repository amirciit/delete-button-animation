# Delete Button Animation — v5

This version keeps the v4 reference behavior and adds the requested ending.

Sequence:
1. Delete letters are eaten right-to-left.
2. Bin tilts toward the letters.
3. Bin fills progressively as letters enter.
4. Circular broken line rotates with the drag/scrape sound.
5. A check mark is stroke-drawn and **Deleted** animates beside it.
6. Tick + text disappear.
7. A fully filled bin enters from the **left side**.
8. Component returns to its reusable Delete state.

Sounds remain dependency-free using Web Audio API.

Open `index.html` and click the button.
