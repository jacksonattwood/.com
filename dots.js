const canvas = document.getElementById('backgroundCanvas');
const ctx = canvas.getContext('2d');
let width, height;
let particles = [];
const mouse = { x: null, y: null, radius: 100 };
let cursorMoved = false;
let lastMouseMoveTime = 0;
const stillDuration = 3000; // Time after which all particles return home if the mouse is still
const maxDisplacement = 50; // Maximum distance a particle can move from its home

let showfps = false;
let lastFrameTime = 0;
let framerate = 0;

let signatureRect = null; // Variable to store the signature's bounding rectangle
const isMobile = /Mobi|Android/i.test(navigator.userAgent); // Check for mobile device
const mobileGridSpacing = 70; // Adjusted spacing for mobile
const desktopGridSpacing = 70; // Spacing for desktop
const returnToRestDuration = 1000; // Time after which particles return to home

function initCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    createParticles(); // Recreate particles on resize
    updateSignatureStatus(); // Update signature status on resize
}

function createParticles() {
    particles = []; // Clear existing particles
    const gridSpacing = isMobile ? mobileGridSpacing : desktopGridSpacing; // Use mobile or desktop spacing
    for (let x = -gridSpacing; x < width + gridSpacing; x += gridSpacing) { // Allow overlap on the left and right
        for (let y = -gridSpacing; y < height + gridSpacing; y += gridSpacing) { // Allow overlap on the top and bottom
            particles.push({
                x: x,
                y: y,
                originalX: x,
                originalY: y,
                vx: 0,
                vy: 0,
                radius: 3,
                movedByCursor: false,
                lastMovedTime: 0,
                inSignature: false // Keep this for potential future use
            });
        }
    }
}

function updateSignatureStatus() {
    if (!signatureRect) {
        const signature = document.getElementById('signature');
        if (signature) {
            signatureRect = signature.getBoundingClientRect();
        }
    }
    particles.forEach(p => {
        p.inSignature = isParticleInSignature(p);
    });
}

function isParticleInSignature(p) {
    if (!signatureRect) return false;
    return p.x > signatureRect.left && p.x < signatureRect.right && p.y > signatureRect.top && p.y < signatureRect.bottom;
}

function drawParticles() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    });
}

function drawLines() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; // Set stroke style once before loops
    const drawnPairs = new Set(); // To keep track of drawn pairs

    particles.forEach(p => {
        particles.forEach(other => {
            if (other === p) return; // Skip drawing lines to itself

            const dx = p.x - other.x;
            const dy = p.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 100) {
                // Create a unique identifier for the line (for both directions)
                const pairId = p.x < other.x ? `${p.x}-${p.y}-${other.x}-${other.y}` : `${other.x}-${other.y}-${p.x}-${p.y}`;

                if (!drawnPairs.has(pairId)) { // Draw line only if not drawn before
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(other.x, other.y);
                    ctx.stroke();
                    ctx.closePath();
                    drawnPairs.add(pairId); // Mark this pair as drawn
                }
            }
        });

        if (cursorMoved) {
            const dxMouse = p.x - mouse.x;
            const dyMouse = p.y - mouse.y;
            const distanceMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
            if (distanceMouse < mouse.radius) {
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.stroke();
                ctx.closePath();
            }
        }
    });
}

function updateParticles() {
    const currentTime = Date.now();
    const cursorStill = currentTime - lastMouseMoveTime > stillDuration;

    particles.forEach(p => {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (cursorMoved && distance < mouse.radius) {
            // Particle is affected by cursor, move it slightly
            const angle = Math.atan2(dy, dx);
            const displacement = Math.min(maxDisplacement, mouse.radius - distance); // Limit displacement
            p.vx = Math.cos(angle) * displacement * 0.05; // Lower speed factor
            p.vy = Math.sin(angle) * displacement * 0.05;
            p.movedByCursor = true;
            p.lastMovedTime = currentTime;
        } else if (distance >= mouse.radius && p.movedByCursor) {
            // Cursor is outside radius, return to home immediately
            const angle = Math.atan2(p.originalY - p.y, p.originalX - p.x);
            p.vx = Math.cos(angle) * 0.5;
            p.vy = Math.sin(angle) * 0.5;

            const distanceToHome = Math.sqrt((p.originalX - p.x) ** 2 + (p.originalY - p.y) ** 2);
            
            // If particle reaches its home position, stop movement
            if (distanceToHome < 1) {
                p.vx = 0;
                p.vy = 0;
                p.movedByCursor = false; // Reset after returning home
            }
        } else if (cursorStill) {
            // If cursor is still for the specified duration, return all particles to home
            const angle = Math.atan2(p.originalY - p.y, p.originalX - p.x);
            p.vx = Math.cos(angle) * 0.5;
            p.vy = Math.sin(angle) * 0.5;

            const distanceToHome = Math.sqrt((p.originalX - p.x) ** 2 + (p.originalY - p.y) ** 2);
            
            if (distanceToHome < 1) {
                p.vx = 0;
                p.vy = 0;
                p.movedByCursor = false; // Reset after returning home
            }
        } else if (currentTime - lastMouseMoveTime > returnToRestDuration) {
            // If no input has been detected for a specified duration, return all particles to home
            const angle = Math.atan2(p.originalY - p.y, p.originalX - p.x);
            p.vx = Math.cos(angle) * 0.5;
            p.vy = Math.sin(angle) * 0.5;

            const distanceToHome = Math.sqrt((p.originalX - p.x) ** 2 + (p.originalY - p.y) ** 2);
            
            if (distanceToHome < 1) {
                p.vx = 0;
                p.vy = 0;
                p.movedByCursor = false; // Reset after returning home
            }
        } else {
            // No movement unless affected by cursor or returning home
            p.vx = 0;
            p.vy = 0;
        }

        // Update particle position
        p.x += p.vx;
        p.y += p.vy;

        // Update signature status only when particles are moving
        if (p.vx !== 0 || p.vy !== 0) {
            p.inSignature = isParticleInSignature(p);
        }
    });
}

function calculateFramerate() {
    const now = performance.now();
    const delta = now - lastFrameTime;
    framerate = 1000 / delta;
    lastFrameTime = now;
}

function displayFramerate() {
    ctx.font = '16px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(`FPS: ${framerate.toFixed(1)}`, 10, 20);
}

function animate() {
    calculateFramerate();
    drawParticles();
    drawLines();
    updateParticles();
    if (showfps) {
        displayFramerate();
    }
    requestAnimationFrame(animate);
}

// Mouse Events
window.addEventListener('resize', initCanvas);
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    cursorMoved = true;
    lastMouseMoveTime = Date.now();
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'i' || e.key === 'I') {
        showfps = !showfps;
    }
});

// Touch Events
window.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    mouse.x = touch.clientX;
    mouse.y = touch.clientY;
    cursorMoved = true;
    lastMouseMoveTime = Date.now();
});

window.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    mouse.x = touch.clientX;
    mouse.y = touch.clientY;
    cursorMoved = true;
    lastMouseMoveTime = Date.now();
    e.preventDefault(); // Prevent scrolling on touch devices
});

window.addEventListener('touchend', () => {
    cursorMoved = false; // Indicate that touch has ended
});

window.addEventListener('mouseleave', () => {
    cursorMoved = false; // Indicate that mouse has left the window
});

initCanvas();
createParticles();
animate();
