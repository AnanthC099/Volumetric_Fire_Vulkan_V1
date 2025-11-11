# Real-time Procedural Volumetric Fire — what it does and how

**One-line takeaway:** this 7-page I3D’07 submission proposes an *artist-driven, curve-deformed, slice-rendered* volumetric fire where micro-detail/animation comes from GPU noise (Improved Perlin or M-Noise). It replaces sprite/billboard fires with a true 3D effect that’s fast, editable, and interactive.

## Keyboard controls

* `F` — toggle fullscreen.
* `Z` / `X` — decrease / increase the number of volumetric slices (rebuilds geometry as needed).
* `C` / `V` — shrink / grow the fire radius.
* `B` / `N` — shorten / extend the fire height.
* `G` / `H` — decrease / increase the noise scale along the X axis (width of tongues).
* `J` / `K` — decrease / increase the noise scale along the Y axis (vertical stretching).
* `U` / `I` — decrease / increase the noise scale along the Z axis (depth thickness).
* `O` / `P` — slow down / speed up the upward profile scroll.
* `1` / `2` — lower / raise turbulence intensity.
* `3` / `4` — slow down / speed up the overall animation rate.
* `0` — reset all fire parameters to their defaults.

## Pipeline at a glance

* **Artist “fire profile” texture → unit volume.** A 2D RGBA profile defines color/opacity/shape; it’s swept around the z-axis to form a *cylindrical* “unit fire volume.” Mapping: (u=\sqrt{x^2+y^2},, v=z). (See **Fig. 5** on p.3.) 
* **Macro shape via volumetric FFD.** A center **B-spline** curve (C(t)) controls the fire’s path; a **lattice** is built around it (four “corner curves” per sample). The GPU *implicitly* evaluates the deformation by interpolating the unit-volume texcoords across the deformed lattice. (Figs. 6–9 on pp.3–5.) 
* **Rendering:** per frame, **view-aligned slices** through each lattice segment; **additive blending** accumulates emissive fire (equivalent to evenly-spaced ray samples). (Fig. 10 on p.5; also Fig. 11 shows stylistic variants like opaque “cartoon” fire or tinted fire.) 
* **Micro detail & animation:** **turbulence (multi-octave noise)** in the pixel shader offsets the profile’s vertical coordinate to create tongues, flicker, upward flow. They recommend **M-Noise** for speed or **Improved Perlin** for fidelity; optional 4D noise uses time as the 4th dim. (Fig. 12 on p.6.) 
* **Interactivity:** macro motion from an optional **particle sim** (wind, dispersion, **thermal buoyancy**) that moves the curve’s control points, enabling scene–fire coupling. 

## Key equations the shader/CPU uses

* **Deformation curve:** standard open uniform B-spline basis (N_{i,p}(t)); the fire path is (C(t)=\sum N_{i,\text{degree}}(t)P_i). (Sec. 3.) 
* **Noise-driven mapping:**

  * Scale “noise space” by world-space **radius/length** to avoid stretching as the FFD changes: (\text{noisescale}=(r,r,\text{length},1)\cdot \text{frequency}).
  * 4D noise position: ((x,y,z-\text{time},\text{time}) \cdot \text{noisescale}) (the (-\text{time}) in (z) yields upward drift).
  * Vertical profile offset: (v = z + f(z),\text{turbulence}(\text{noisepos} + \text{offset})), with (f(z)) often (\text{stability}\cdot\sqrt{z}).
  * Final color = **profileTexture**((u,v)). (Eqs. 9–14 in Sec. 4.2.) 

## Why this matters (and what it fixes)

* **Sprite fire problems:** seams where 2D sprites intersect 3D geometry and obvious animation loops (see **Fig. 3** on p.2; also the “Vulcan” demo smoke workaround in **Fig. 4**). The paper’s volumetric approach avoids these artifacts and supports real scene interaction. 

## Performance knobs (and data)

* Frame rate scales with **occupied screen space**, **slice spacing**, **octaves**, **lattice resolution**, **noise type**, and **GPU**. On a GeForce 7800 GT with ~90k on-screen pixels and 0.2 slice spacing, they report from ~157 fps (1-octave M-Noise, modest lattice) down to ~30 fps (3 octaves of 4D Improved Perlin, dense lattice). (Table 1 on p.7.) 

## Strengths & limits (practical take)

**Pros**

* **Artist-friendly:** change hue/shape/brightness by painting the profile; fast look-dev. (Fig. 11 shows style range.) 
* **Geometric control:** intuitive pathing with a spline; easy to add swirls, bends, tilts. 
* **Performance-tunable:** slice density, lattice resolution, and noise choice are adjustable. 

**Cons**

* **Not physically-based lighting:** emissive + additive; no volumetric self-shadowing/scattering. 
* **Approximation artifacts:** linear interpolation in the lattice can kink first derivatives unless you use enough sections (Nyquist guidance: ≥2 lattice sections per pixel, but curvature/coverage/length drive the real choice). 
* **Slicing complexity:** you must generate & draw many view-aligned slices per lattice segment. 

## How I’d implement this today (Vulkan/DirectX)

1. **Authoring:** paint a 2D fire profile (RGBA gradient ramp with bright core & alpha falloff). 
2. **CPU build:** create a center B-spline; at (c) samples along (length-parametrized), build a square cross-section aligned to the curve’s normal; connect samples to form a **lattice**; store per-vertex *unit-volume texcoord* ((\pm1,,i/(c-1),,\pm1)). (Figs. 8–9.) 
3. **Per-frame draw:** for each lattice chunk, emit **view-aligned slices** (instanced quads) that span its local bounds; enable **additive blending**; depth test on, depth write off. (Fig. 10.) 
4. **Pixel shader:** compute 3D/4D **noise turbulence** using world-anchored scaling; offset the profile’s *v* coordinate; sample the profile texture; accumulate. Prefer **M-Noise** if tight on ALU/SM instructions; bump octaves until you like the look. (Sec. 4.2; Fig. 12.) 
5. **Optional dynamics:** run a light **particle-driven** controller for the curve control points (wind ( \mathbf{w}(x,t)), high-energy dispersion ( \mathbf{d}(T)), buoyancy ( \mathbf{c}(T,\text{age}))). (Sec. 3; Eqs. 7–8.) 

## Visual cues worth noting (by page)

* **p.1 Fig. 2:** clean block diagram of the pipeline (profile → pixel shader noise + FFD → volumetric fire). 
* **p.2 Fig. 3 / p.2 Fig. 4:** why sprites fail (seams/looping); motivation for a volumetric method. 
* **p.4 Fig. 7:** lattice in unit space vs deformed world space—this is the key trick enabling GPU-side “implicit” deformation. 
* **p.5 Fig. 10:** the slice-based volume rendering setup you’ll implement. 
* **p.6 Fig. 12:** frame-to-frame variation and the “noise-offset vertical coordinate” effect (spikes/plumes). 

If you want, I can turn this into a short Vulkan task list (buffers, blend state, shader pseudocode, and parameters to expose) tailored to your ARTR project. 

Note : Use firetex.png as fire profile texture and check how can you use nzw.png.


What about Fire of diffrent shapes like Swastika ?
Read contents  Shape.PNG for steps to do  and there choose Step 1
Image to be used is Swastika_Transparent.png