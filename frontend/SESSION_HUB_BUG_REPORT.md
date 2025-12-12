# Session Hub Bug Report

## Issue Summary
The `.session-hub.glass` element flashes rapidly between two vertical positions, making it unusable.

## Test Results
- **Position monitoring**: Captured 424 measurements over 2 seconds
- **Position jumps**: 226 significant position changes detected
- **Rapid flashing**: 225 position changes occurred within 50ms of each other (~8ms intervals)
- **Positions**: Element oscillates between Y=188px and Y=592px (404px delta)

## Root Cause
CSS hover state creates an infinite loop:

1. Element is in `.session-hub.peeking` state at bottom of screen
2. User hovers → `.session-hub.peeking:hover` applies
3. `transform` changes, moving element up
4. Mouse is no longer over element → hover state removed
5. Element moves back down → mouse is over element again
6. Repeat steps 2-5 infinitely at browser repaint rate

### Problematic CSS (App.css lines 984-1011)
```css
.session-hub {
  transform: translateX(-50%) translateY(calc(100% - 8rem));
  /* Element positioned at bottom */
}

.session-hub.peeking:hover {
  transform: translateX(-50%) translateY(calc(100% - 22rem));
  /* Moves up 14rem on hover, but this causes mouse to lose hover */
  max-height: 22rem;
}
```

## Secondary Issue: Missing Label
User reports only seeing "Spectate Live" label, not "Join a collab". However, tests confirm both labels ARE present in the DOM and visible. The flashing makes the second label difficult to perceive visually.

## Recommended Fix
Replace the hover-triggered transform with one of these approaches:

### Option 1: Expand upward without moving the anchor point
Use a combination of `bottom` positioning and height expansion instead of transform:

```css
.session-hub {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  /* Remove translateY */
}

.session-hub.peeking {
  height: 4.5rem;
}

.session-hub.peeking:hover {
  height: 22rem;
  /* Expands upward from bottom anchor */
}
```

### Option 2: Use pointer-events to maintain hover state
Expand the hover hitbox so mouse stays within element:

```css
.session-hub {
  /* Keep existing positioning */
}

.session-hub::before {
  content: '';
  position: absolute;
  top: -14rem; /* Cover the gap where element will move to */
  left: 0;
  right: 0;
  height: 14rem;
  pointer-events: auto;
}

.session-hub.peeking:hover {
  /* Keep existing transform */
}
```

### Option 3: Add transition delay to prevent rapid toggling
```css
.session-hub.peeking {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition-delay: 0s; /* Immediate when entering hover */
}

.session-hub.peeking:hover {
  transition-delay: 0.2s; /* Delay before reverting */
}
```

## Test Files
- `/frontend/tests/session-hub-position.spec.ts` - Monitors position every 1ms
- Screenshots in `/frontend/test-artifacts/session-hub-*.png`
