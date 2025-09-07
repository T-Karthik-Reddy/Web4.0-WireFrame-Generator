
export const draggabilityScript = `
(function() {
    'use strict';

    let draggedElement = null;
    let hoveredElement = null;
    let startX = 0;
    let startY = 0;
    let initialTranslateX = 0;
    let initialTranslateY = 0;

    const DRAGGABLE_SELECTOR = '*:not(html, body, script, style, a, button, input, textarea, select)';
    const HIGHLIGHT_STYLE = '2px solid #38bdf8'; // A bright blue color (Tailwind's sky-500)
    const HIGHLIGHT_OUTLINE_OFFSET = '-2px';

    function getElementSelector(el) {
        if (!el || !(el instanceof Element)) {
            return '';
        }
        
        let path = [];
        while (el && el.nodeType === Node.ELEMENT_NODE) {
            let selector = el.nodeName.toLowerCase();
            if (el.id) {
                selector += '#' + el.id;
                path.unshift(selector);
                break; // IDs are unique, no need to go further
            } else {
                let sibling = el;
                let nth = 1;
                while (sibling = sibling.previousElementSibling) {
                    if (sibling.nodeName.toLowerCase() === selector) {
                        nth++;
                    }
                }
                if (nth !== 1) {
                    selector += ":nth-of-type("+nth+")";
                }
            }
            path.unshift(selector);
            el = el.parentNode;
        }
        return path.join(" > ");
    }
    
    function getInitialTransform(el) {
        const style = window.getComputedStyle(el);
        const matrix = style.transform || style.webkitTransform || style.mozTransform;

        if (matrix === 'none' || typeof matrix === 'undefined') {
            return { x: 0, y: 0 };
        }

        const matrixType = matrix.includes('3d') ? '3d' : '2d';
        const matrixValues = matrix.match(/matrix.*\((.+)\)/)[1].split(', ');

        if (matrixType === '2d') {
            return { x: parseFloat(matrixValues[4]), y: parseFloat(matrixValues[5]) };
        } else { // 3d
            return { x: parseFloat(matrixValues[12]), y: parseFloat(matrixValues[13]) };
        }
    }

    function handleMouseOver(e) {
        const target = e.target;
        if (!target || !target.matches(DRAGGABLE_SELECTOR)) return;
        
        if (hoveredElement && hoveredElement !== target) {
            hoveredElement.style.outline = '';
            hoveredElement.style.outlineOffset = '';
        }
        
        hoveredElement = target;
        hoveredElement.style.cursor = 'move';
        hoveredElement.style.outline = HIGHLIGHT_STYLE;
        hoveredElement.style.outlineOffset = HIGHLIGHT_OUTLINE_OFFSET;
    }

    function handleMouseOut(e) {
        if (hoveredElement) {
            hoveredElement.style.cursor = '';
            hoveredElement.style.outline = '';
            hoveredElement.style.outlineOffset = '';
            hoveredElement = null;
        }
    }

    function handleMouseDown(e) {
        if (!hoveredElement || !e.target.matches(DRAGGABLE_SELECTOR)) return;

        e.preventDefault();
        e.stopPropagation();
        
        draggedElement = hoveredElement;
        
        const initialTransform = getInitialTransform(draggedElement);
        initialTranslateX = initialTransform.x;
        initialTranslateY = initialTransform.y;
        
        startX = e.clientX;
        startY = e.clientY;

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp, { once: true });
    }

    function handleMouseMove(e) {
        if (!draggedElement) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        draggedElement.style.transform = \`translate(\${initialTranslateX + dx}px, \${initialTranslateY + dy}px)\`;
    }

    function handleMouseUp(e) {
        document.removeEventListener('mousemove', handleMouseMove);
        
        if (!draggedElement) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        const finalTranslateX = initialTranslateX + dx;
        const finalTranslateY = initialTranslateY + dy;
        
        const selector = getElementSelector(draggedElement);
        const transformValue = \`translate(\${finalTranslateX.toFixed(2)}px, \${finalTranslateY.toFixed(2)}px)\`;

        if (selector && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) { // Only send if moved significantly
            window.parent.postMessage({
                type: 'element-dragged',
                selector: selector,
                transform: transformValue
            }, '*');
        }

        // Reset the temporary inline style so the component can re-render with the permanent style
        if (initialTranslateX !== 0 || initialTranslateY !== 0) {
             draggedElement.style.transform = \`translate(\${initialTranslateX}px, \${initialTranslateY}px)\`;
        } else {
            draggedElement.style.transform = '';
        }
        
        draggedElement = null;
    }

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('mousedown', handleMouseDown);
})();`;