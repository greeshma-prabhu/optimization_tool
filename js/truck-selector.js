/**
 * Truck Allocation Manager
 * Handles smart truck availability across 3 routes
 */
class TruckAllocationManager {
  constructor() {
    this.availableTrucks = [
      { id: 'truck1', name: 'Vrachtwagen 1', type: 'own' },
      { id: 'truck2', name: 'Vrachtwagen 2', type: 'own' },
      { id: 'neighbor', name: "Buurman's Vrachtwagen", type: 'neighbor' },
      { id: 'external', name: 'Externe Vrachtwagen', type: 'external' }
    ];

    this.allocations = {
      route1: [],
      route2: [],
      route3: []
    };
  }

  getAvailableTrucksForRoute(routeNumber) {
    if (routeNumber === 1) {
      return this.availableTrucks.map(truck => ({
        ...truck,
        available: true,
        reason: null
      }));
    }

    if (routeNumber === 2) {
      const route1Trucks = this.allocations.route1 || [];
      return this.availableTrucks.map(truck => ({
        ...truck,
        available: !route1Trucks.includes(truck.id),
        reason: route1Trucks.includes(truck.id)
          ? 'Gebruikt door Route 1 (Rijnsburg)'
          : null
      }));
    }

    if (routeNumber === 3) {
      const route2Trucks = this.allocations.route2 || [];
      return this.availableTrucks.map(truck => ({
        ...truck,
        available: !route2Trucks.includes(truck.id),
        reason: route2Trucks.includes(truck.id)
          ? 'Gebruikt door Route 2 (Aalsmeer)'
          : null
      }));
    }

    return [];
  }

  allocateTrucks(routeNumber, truckIds) {
    const routeKey = `route${routeNumber}`;
    this.allocations[routeKey] = truckIds;
    this.updateAllRouteSelectors();
  }

  getSelectedTrucks(routeNumber) {
    return this.allocations[`route${routeNumber}`] || [];
  }

  updateAllRouteSelectors() {
    [1, 2, 3].forEach(routeNum => {
      this.renderTruckSelector(routeNum);
    });
  }

  renderTruckSelector(routeNumber) {
    const container = document.getElementById(`route${routeNumber}-truck-selector`);
    if (!container) return;

    const availableTrucks = this.getAvailableTrucksForRoute(routeNumber);
    const selectedTrucks = this.getSelectedTrucks(routeNumber);

    const routeNames = {
      1: 'Route 1: Rijnsburg (09:00)',
      2: 'Route 2: Aalsmeer (10:00)',
      3: 'Route 3: Naaldwijk (11:00)'
    };

    container.innerHTML = `
      <div class="truck-selector-container">
        <h4>${routeNames[routeNumber]}</h4>
        <p class="truck-selector-hint">${window.Language ? window.Language.t('select_truck') : 'Selecteer welke vrachtwagens voor deze route:'}</p>

        <div class="truck-options">
          ${availableTrucks.map(truck => `
            <label class="truck-option ${!truck.available ? 'disabled' : ''}">
              <input
                type="checkbox"
                value="${truck.id}"
                ${selectedTrucks.includes(truck.id) ? 'checked' : ''}
                ${!truck.available ? 'disabled' : ''}
                onchange="window.truckManager.handleTruckChange(${routeNumber}, this)"
              />
              <span class="truck-name">${window.Language ? window.Language.t(truck.id) : truck.name}</span>
              ${!truck.available ? `<span class="truck-unavailable">(${truck.reason})</span>` : ''}
            </label>
          `).join('')}
        </div>

        <div class="selected-trucks-summary">
          <strong>${window.Language ? window.Language.t('selected') : 'Geselecteerd'}:</strong>
          ${selectedTrucks.length > 0
            ? selectedTrucks.map(id => window.Language ? window.Language.t(id) : (availableTrucks.find(t => t.id === id)?.name || id)).join(' + ')
            : (window.Language ? window.Language.t('no_trucks_selected') : 'Geen vrachtwagens geselecteerd')
          }
        </div>
      </div>
    `;
  }

  handleTruckChange(routeNumber, checkbox) {
    const truckId = checkbox.value;
    let selectedTrucks = this.getSelectedTrucks(routeNumber);

    if (checkbox.checked) {
      if (!selectedTrucks.includes(truckId)) {
        selectedTrucks.push(truckId);
      }
    } else {
      selectedTrucks = selectedTrucks.filter(id => id !== truckId);
    }

    this.allocateTrucks(routeNumber, selectedTrucks);
  }

  getAllocationSummary() {
    return {
      route1: {
        name: 'Rijnsburg (09:00)',
        trucks: this.allocations.route1,
        count: this.allocations.route1.length
      },
      route2: {
        name: 'Aalsmeer (10:00)',
        trucks: this.allocations.route2,
        count: this.allocations.route2.length
      },
      route3: {
        name: 'Naaldwijk (11:00)',
        trucks: this.allocations.route3,
        count: this.allocations.route3.length
      }
    };
  }
}

function showTruckAllocationSummary() {
  if (!window.truckManager) return;
  const summary = window.truckManager.getAllocationSummary();

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 600px;">
      <h3>📋 Vrachtwagen Toewijzing Overzicht</h3>
      <div class="allocation-summary-content">
        ${Object.entries(summary).map(([key, data]) => `
          <div class="route-allocation-item">
            <h4>${data.name}</h4>
            <p><strong>Vrachtwagens:</strong> ${data.count > 0
              ? data.trucks.map(id =>
                  window.truckManager.availableTrucks.find(t => t.id === id)?.name || id
                ).join(', ')
              : 'Geen vrachtwagens toegewezen'
            }</p>
          </div>
        `).join('')}
      </div>
      <button onclick="this.closest('.modal-backdrop').remove()" class="btn-primary">
        Sluiten
      </button>
    </div>
  `;

  document.body.appendChild(modal);
}

window.truckManager = new TruckAllocationManager();
window.showTruckAllocationSummary = showTruckAllocationSummary;

document.addEventListener('DOMContentLoaded', () => {
  window.truckManager.updateAllRouteSelectors();
});

