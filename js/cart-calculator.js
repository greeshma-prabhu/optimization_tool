/**
 * Zuidplas Logistics - Cart Calculator
 * Handles cart counting, capacity validation, and truck visualization
 */

(function() {
    'use strict';

    // Calculator state
    let state = {
        standardCarts: 0,
        danishCarts: 0,
        maxStandard: 17,
        currentMax: 17
    };

    /**
     * Initialize calculator when DOM is ready
     */
    document.addEventListener('DOMContentLoaded', function() {
        if (document.getElementById('standard-count')) {
            initCalculator();
        }
    });

    /**
     * Initialize calculator UI and event listeners
     */
    function initCalculator() {
        // Standard cart controls
        const standardMinus = document.getElementById('standard-minus');
        const standardPlus = document.getElementById('standard-plus');
        const standardValue = document.getElementById('standard-count');
        
        if (standardMinus) {
            standardMinus.addEventListener('click', () => adjustCart('standard', -1));
        }
        if (standardPlus) {
            standardPlus.addEventListener('click', () => adjustCart('standard', 1));
        }

        // Danish cart controls
        const danishMinus = document.getElementById('danish-minus');
        const danishPlus = document.getElementById('danish-plus');
        const danishValue = document.getElementById('danish-count');
        
        if (danishMinus) {
            danishMinus.addEventListener('click', () => adjustCart('danish', -1));
        }
        if (danishPlus) {
            danishPlus.addEventListener('click', () => adjustCart('danish', 1));
        }

        // Quick buttons
        const quickButtons = document.querySelectorAll('.quick-btn');
        quickButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const action = this.dataset.action;
                handleQuickAction(action);
            });
        });

        // Initialize display
        updateCalculator();
    }

    /**
     * Adjust cart count
     */
    function adjustCart(type, delta) {
        if (type === 'standard') {
            state.standardCarts = Math.max(0, Math.min(state.maxStandard, state.standardCarts + delta));
        } else if (type === 'danish') {
            state.danishCarts = Math.max(0, state.danishCarts + delta);
            
            // Check Danish cart rule: if >6 Danish, capacity becomes 16
            if (state.danishCarts > 6) {
                state.currentMax = 16;
            } else {
                state.currentMax = state.maxStandard;
            }
            
            // Adjust standard carts if total exceeds capacity
            const equivalentStandard = state.standardCarts + Math.ceil(state.danishCarts / 2);
            if (equivalentStandard > state.currentMax) {
                state.standardCarts = Math.max(0, state.currentMax - Math.ceil(state.danishCarts / 2));
            }
        }
        
        updateCalculator();
    }

    /**
     * Handle quick action buttons
     */
    function handleQuickAction(action) {
        const parts = action.split('-');
        const type = parts[0]; // 'standard' or 'danish'
        const value = parseInt(parts[1]); // 5, 10, or 'clear'
        
        if (value === 0) {
            // Clear
            if (type === 'standard') {
                state.standardCarts = 0;
            } else {
                state.danishCarts = 0;
                state.currentMax = state.maxStandard;
            }
        } else {
            // Add value
            if (type === 'standard') {
                state.standardCarts = Math.min(state.maxStandard, state.standardCarts + value);
            } else {
                state.danishCarts += value;
                if (state.danishCarts > 6) {
                    state.currentMax = 16;
                }
            }
        }
        
        updateCalculator();
    }

    /**
     * Update calculator display
     */
    function updateCalculator() {
        // Update counters
        const standardCountEl = document.getElementById('standard-count');
        const danishCountEl = document.getElementById('danish-count');
        
        if (standardCountEl) standardCountEl.textContent = state.standardCarts;
        if (danishCountEl) danishCountEl.textContent = state.danishCarts;

        // Calculate totals
        const equivalentStandard = state.standardCarts + Math.ceil(state.danishCarts / 2);
        const totalCarts = state.standardCarts + state.danishCarts;
        const remaining = state.currentMax - equivalentStandard;

        // Update capacity display
        const capacityDisplay = document.getElementById('capacity-display');
        if (capacityDisplay) {
            capacityDisplay.textContent = `Capacity: ${state.currentMax} carts`;
        }

        // Update total carts and equivalent standard
        const totalCartsEl = document.getElementById('total-carts');
        const maxCartsEl = document.getElementById('max-carts');
        const equivalentStandardEl = document.getElementById('equivalent-standard');
        
        if (totalCartsEl) totalCartsEl.textContent = totalCarts;
        if (maxCartsEl) maxCartsEl.textContent = state.currentMax;
        if (equivalentStandardEl) equivalentStandardEl.textContent = equivalentStandard;

        // Update warning
        const warningDiv = document.getElementById('capacity-warning');
        if (warningDiv) {
            if (state.danishCarts > 6) {
                warningDiv.textContent = '⚠️ Danish cart limit exceeded - capacity reduced to 16';
                warningDiv.style.color = '#f59e0b';
                warningDiv.style.display = 'block';
            } else {
                warningDiv.textContent = '';
                warningDiv.style.display = 'none';
            }
        }

        // Update summary
        updateSummary(equivalentStandard, totalCarts, remaining);

        // Update capacity bar
        updateCapacityBar(equivalentStandard);

        // Update truck visualization
        updateTruckVisualization(equivalentStandard);

        // Update conversion display
        updateConversionDisplay();
    }

    /**
     * Update summary section
     */
    function updateSummary(equivalentStandard, totalCarts, remaining) {
        const summaryStandard = document.getElementById('summary-standard');
        const summaryDanish = document.getElementById('summary-danish');
        const summaryTotal = document.getElementById('summary-total');
        const summaryRemaining = document.getElementById('summary-remaining');
        const summaryWarning = document.getElementById('summary-warning');

        if (summaryStandard) summaryStandard.textContent = state.standardCarts;
        if (summaryDanish) summaryDanish.textContent = state.danishCarts;
        if (summaryTotal) summaryTotal.textContent = totalCarts;
        if (summaryRemaining) summaryRemaining.textContent = Math.max(0, remaining);

        // Update warning message
        if (summaryWarning) {
            if (state.danishCarts > 6) {
                summaryWarning.style.display = 'block';
                summaryWarning.className = 'info-box warning';
                summaryWarning.innerHTML = '⚠️ <strong>Warning:</strong> More than 6 Danish carts used. Truck capacity reduced to 16 carts.';
            } else if (equivalentStandard >= state.currentMax) {
                summaryWarning.style.display = 'block';
                summaryWarning.className = 'info-box danger';
                summaryWarning.innerHTML = '⚠️ <strong>Overload:</strong> Truck capacity exceeded!';
            } else {
                summaryWarning.style.display = 'none';
            }
        }
    }

    /**
     * Update capacity bar
     */
    function updateCapacityBar(equivalentStandard) {
        const barFill = document.getElementById('capacity-bar-fill');
        if (!barFill) return;

        const percentage = Math.min(100, (equivalentStandard / state.currentMax) * 100);
        barFill.style.width = percentage + '%';
        barFill.textContent = Math.round(percentage) + '%';

        // Update color based on capacity
        barFill.classList.remove('warning', 'danger');
        if (percentage >= 100) {
            barFill.classList.add('danger');
        } else if (percentage >= 80) {
            barFill.classList.add('warning');
        }
    }

    /**
     * Update truck visualization
     */
    function updateTruckVisualization(equivalentStandard) {
        const container = document.getElementById('truck-slots');
        if (!container) return;

        container.innerHTML = '';
        const slots = state.currentMax;

        for (let i = 0; i < slots; i++) {
            const slot = document.createElement('div');
            slot.className = 'cart-slot';

            if (i < state.standardCarts) {
                slot.classList.add('filled');
                slot.textContent = 'S';
                slot.title = 'Standard Cart';
            } else if (i < equivalentStandard) {
                slot.classList.add('danish');
                slot.textContent = 'D';
                slot.title = 'Danish Cart';
            } else {
                slot.textContent = i + 1;
                slot.title = 'Empty Slot';
            }

            container.appendChild(slot);
        }
    }

    /**
     * Update conversion display
     */
    function updateConversionDisplay() {
        const conversionEl = document.getElementById('danish-conversion');
        if (conversionEl) {
            const standardEquivalent = Math.ceil(state.danishCarts / 2);
            conversionEl.textContent = `${state.danishCarts} Danish = ${standardEquivalent} Standard equivalent`;
        }
    }

    /**
     * Reset calculator
     */
    function resetCalculator() {
        state.standardCarts = 0;
        state.danishCarts = 0;
        state.currentMax = state.maxStandard;
        updateCalculator();
    }

    /**
     * Get current state (for external use)
     */
    function getState() {
        return {
            ...state,
            equivalentStandard: state.standardCarts + Math.ceil(state.danishCarts / 2),
            totalCarts: state.standardCarts + state.danishCarts
        };
    }

    // Export for global use
    window.CartCalculator = {
        adjust: adjustCart,
        reset: resetCalculator,
        getState: getState,
        update: updateCalculator
    };
})();

