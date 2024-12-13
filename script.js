'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const clearAll = document.querySelector('.clear__label');
const deleteElement = document.querySelector('.delete__workout__row');

class App {
  #map;
  #mapEvent;
  #zoomLevel = 13;
  #workouts = []; // []

  constructor() {
    this._getPosition();
    this._getWorkouts();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));
    clearAll.addEventListener('click', this._clear);
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(this._loadMap.bind(this),
      function() {
        prompt('Could not get location');
      });
  }

  _loadMap(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    this.#map = L.map('map').setView([latitude, longitude], this.#zoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(workout => this._renderWorkoutMarker(workout));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let workout;

    e.preventDefault();
    const coordinates = [this.#mapEvent.latlng.lat, this.#mapEvent.latlng.lng];

    function _isValidInput(...inputs) {
      return inputs.every(input => Number.isFinite(input) && input > 0);
    }

    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (!_isValidInput(distance, duration, cadence)) return prompt('Please enter a positive numbers');
      workout = new Running(coordinates, distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (!_isValidInput(distance, duration)) return prompt('Please enter a positive numbers');
      workout = new Cycling(coordinates, distance, duration, elevation);
    }

    this.#workouts.push(workout);
    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);
    this._hideForm();
    this._saveWorkouts();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coordinates).addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          maxHeight: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`
        })
      )
      .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
      .openPopup();
  }

  _hideForm() {
    inputDistance.value = inputDuration.value = inputElevation.value = inputCadence.value = '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => form.style.display = 'grid', 1000);
  }

  _renderWorkout(workout) {
    let html =
      `<li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <label class="delete__workout__row">❌</label>
      <div class="workout__details">
        <span class="workout__icon">${workout.type === 'running' ? '🏃' : '🚴‍♀️'}</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>`;

    if (workout.type === 'running') {
      html += `<div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>`;
    }

    if (workout.type === 'cycling') {
      html += `<div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>`;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const selectedElement = e.target.closest('.workout');
    if (!selectedElement || e.target.classList.contains('delete__workout__row')) return;

    const fetchedWorkout = this.#workouts.find((workout) => workout.id === selectedElement.dataset.id);
    this.#map.setView(fetchedWorkout.coordinates, this.#zoomLevel, {
      animate: true,
      pan: {
        duration: 1
      }
    });
  }

  _saveWorkouts() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getWorkouts() {
    const fetchedWorkouts = localStorage.getItem('workouts');
    if (!fetchedWorkouts) return;

    this.#workouts = JSON.parse(fetchedWorkouts);
    this.#workouts.forEach(workout => this._renderWorkout(workout));
  }

  _deleteWorkout(e) {
    const currentDeleteElement = e.target.closest('.delete__workout__row');
    if (!currentDeleteElement) return;

    const workout = currentDeleteElement.closest('.workout');
    const workoutId = workout.dataset.id;
    const fetchedWorkouts = JSON.parse(localStorage.getItem('workouts'));
    const filteredWorkouts = fetchedWorkouts.filter(workout => workout.id !== workoutId);

    localStorage.setItem('workouts', JSON.stringify(filteredWorkouts));
    location.reload();
  }

  _clear() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

class Workout {
  id = (Date.now() + '').slice(-10);
  date = new Date();

  constructor(coordinates, distance, duration) {
    this.coordinates = coordinates;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coordinates, distance, duration, cadence) {
    super(coordinates, distance, duration);
    this.cadence = cadence;
    this._setDescription();
    this.calcPace();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coordinates, distance, duration, elevationGain) {
    super(coordinates, distance, duration);
    this.elevationGain = elevationGain;
    this._setDescription();
    this.calcSpeed();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const app = new App();

const running1 = new Running([1, 2], 200, 40, 30);
// console.log(running1.descirption);
