# Easing Function Dictionary

This document contains formula for animation timing functions.

## Mathematical Constants

These constants are used across various formulas below:

- **PI**: `Math.PI`
- **c1**: `1.70158`
- **c2**: `c1 * 1.525`
- **c3**: `c1 + 1`
- **c4**: `(2 * PI) / 3`
- **c5**: `(2 * PI) / 4.5`
- **n1**: `7.5625`
- **d1**: `2.75`

---

## 1. Linear

**Constant motion.** Best for opacity fades.

- **`linear`**: `x`

## 2. Quadratic

**Subtle acceleration/deceleration.** Standard UI transitions.

- **`easeInQuad`**: `x * x`
- **`easeOutQuad`**: `1 - (1 - x) * (1 - x)`
- **`easeInOutQuad`**: `x < 0.5 ? 2 * x * x : 1 - pow(-2 * x + 2, 2) / 2`

## 3. Cubic

**Pronounced acceleration.** More stylistic transitions.

- **`easeInCubic`**: `x * x * x`
- **`easeOutCubic`**: `1 - pow(1 - x, 3)`
- **`easeInOutCubic`**: `x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2`

## 4. Quartic

**Heavy acceleration.** For elements traveling long distances.

- **`easeInQuart`**: `x * x * x * x`
- **`easeOutQuart`**: `1 - pow(1 - x, 4)`
- **`easeInOutQuart`**: `x < 0.5 ? 8 * x * x * x * x : 1 - pow(-2 * x + 2, 4) / 2`

## 5. Quintic

**Extreme acceleration.** Very fast entries/exits.

- **`easeInQuint`**: `x * x * x * x * x`
- **`easeOutQuint`**: `1 - pow(1 - x, 5)`
- **`easeInOutQuint`**: `x < 0.5 ? 16 * x * x * x * x * x : 1 - pow(-2 * x + 2, 5) / 2`

## 6. Sine

**Natural, gentle waves.** Professional and soft feel.

- **`easeInSine`**: `1 - cos((x * PI) / 2)`
- **`easeOutSine`**: `sin((x * PI) / 2)`
- **`easeInOutSine`**: `-(cos(PI * x) - 1) / 2`

## 7. Exponential

**Extremely fast acceleration.** Snap-like movement.

- **`easeInExpo`**: `x === 0 ? 0 : pow(2, 10 * x - 10)`
- **`easeOutExpo`**: `x === 1 ? 1 : 1 - pow(2, -10 * x)`
- **`easeInOutExpo`**: `x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? pow(2, 20 * x - 10) / 2 : (2 - pow(2, -20 * x + 10)) / 2`

## 8. Circular

**Circular motion arcs.** Mechanical or "clock-like" feel.

- **`easeInCirc`**: `1 - sqrt(1 - pow(x, 2))`
- **`easeOutCirc`**: `sqrt(1 - pow(x - 1, 2))`
- **`easeInOutCirc`**: `x < 0.5 ? (1 - sqrt(1 - pow(2 * x, 2))) / 2 : (sqrt(1 - pow(-2 * x + 2, 2)) + 1) / 2`

## 9. Back (Overshoot)

**Retract and overshoot.** Great for buttons and "pops."

- **`easeInBack`**: `c3 * x * x * x - c1 * x * x`
- **`easeOutBack`**: `1 + c3 * pow(x - 1, 3) + c1 * pow(x - 1, 2)`
- **`easeInOutBack`**: `x < 0.5 ? (pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2 : (pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2`

## 10. Elastic

**Snap and oscillation.** Snappy, rubber-band effect.

- **`easeInElastic`**: `x === 0 ? 0 : x === 1 ? 1 : -pow(2, 10 * x - 10) * sin((x * 10 - 10.75) * c4)`
- **`easeOutElastic`**: `x === 0 ? 0 : x === 1 ? 1 : pow(2, -10 * x) * sin((x * 10 - 0.75) * c4) + 1`
- **`easeInOutElastic`**: `x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? -(pow(2, 20 * x - 10) * sin((20 * x - 11.125) * c5)) / 2 : (pow(2, -20 * x + 10) * sin((20 * x - 11.125) * c5)) / 2 + 1`

## 11. Bounce Logic (Standalone Utility)

**Simulates gravity/physics.** Bouncing elements.
All bounce effects use this logic as their base (referred to as `bounceOut(x)`):

```javascript
if (x < 1 / d1) {
  return n1 * x * x;
} else if (x < 2 / d1) {
  return n1 * (x -= 1.5 / d1) * x + 0.75;
} else if (x < 2.5 / d1) {
  return n1 * (x -= 2.25 / d1) * x + 0.9375;
} else {
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
}
```

- **`easeOutBounce`**: Uses `bounceOut(x)` logic directly.
- **`easeInBounce`**: `1 - bounceOut(1 - x)`
- **`easeInOutBounce`**: `x < 0.5 ? (1 - bounceOut(1 - 2 * x)) / 2 : (1 + bounceOut(2 * x - 1)) / 2`

---

### Usage in Design

Refer to these by name in `tangram/design/ui.md`:

- **Fast/Responsive**: `easeOutQuad`, `easeOutQuart`, or `easeOutExpo`.
- **Playful/High-Energy**: `easeOutBack`, `easeOutElastic`, or `easeOutBounce`.
- **Soft/Professional**: `easeOutSine` or `easeInOutQuad`.
