const state = {
	day: null,
	data: null,
	wordAnswer: '',
	placeAnswer: '',
	minDay: null,
	maxDay: null,
	currentInput: '',
	currentInput2: '',
};

const els = {
	dateLabel: document.getElementById('dateLabel'),
	dayNumber: document.getElementById('dayNumber'),
	riddleSection: document.getElementById('riddleSection'),
	riddleWordText: document.getElementById('riddleWordText'),
	wordDisplay: document.getElementById('wordDisplay'),
	wordInput: document.getElementById('wordInput'),
	checkAnswerBtn: document.getElementById('checkAnswerBtn'),
	resetBtn: document.getElementById('resetBtn'),
	feedback: document.getElementById('feedback'),
	secondRiddleSection: document.getElementById('secondRiddleSection'),
	riddlePlaceText: document.getElementById('riddlePlaceText'),
	wordDisplay2: document.getElementById('wordDisplay2'),
	wordInput2: document.getElementById('wordInput2'),
	checkPlaceBtn: document.getElementById('checkPlaceBtn'),
	resetPlaceBtn: document.getElementById('resetPlaceBtn'),
	placeFeedback: document.getElementById('placeFeedback'),
	messageSection: document.getElementById('messageSection'),
	messageText: document.getElementById('messageText'),
};

function getTodayDayOfAdvent() {
	const now = new Date();
	const isDecember = now.getMonth() === 11; // 0-indexed
	if (!isDecember) return null;
	const d = now.getDate();
	const min = state.minDay ?? 1;
	const max = state.maxDay ?? 31;
	if (d < min || d > max) return null;
	return d;
}

function getSeasonPhase() {
	const now = new Date();
	if (now.getMonth() !== 11) return 'before';
	const d = now.getDate();
	const min = state.minDay ?? 1;
	const max = state.maxDay ?? 31;
	if (d < min) return 'before';
	if (d > max) return 'after';
	return 'during';
}

function getUrlOverride() {
	const params = new URLSearchParams(location.search);
	const dayStr = params.get('day');
	if (!dayStr) return null;
	const n = parseInt(dayStr, 10);
	const min = state.minDay ?? 1;
	const max = state.maxDay ?? 31;
	return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

async function loadData() {
	try {
		const res = await fetch('./data/advent.json', { cache: 'no-store' });
		if (!res.ok) throw new Error('HTTP ' + res.status);
		return await res.json();
	} catch (e) {
		// Fallback for local file:// testing or if JSON missing
		return {
			"8": {
				"indovinelloParola": "Sono piccolo e tondo, mi vedi sullo schermo. Se premi play ti porto lontano. Chi sono?",
				"rispostaParola": "DVD",
				"indovinelloLuogo": "Dove riposano le storie prima di essere viste? È lì che il dono ti aspetta.",
				"rispostaLuogo": "LIBRERIA"
			}
		};
	}
}

function formatDateLabel(d) {
	return d.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function setHeaderDay(day) {
	els.dayNumber.textContent = String(day);
	els.dateLabel.textContent = formatDateLabel(new Date());
}

function showMessage(text) {
	if (els.messageSection) {
		els.messageText.textContent = text;
		els.messageSection.classList.remove('hidden');
	}
	if (els.riddleSection) els.riddleSection.classList.add('hidden');
	els.secondRiddleSection.classList.add('hidden');
	els.dayNumber.textContent = '—';
	// cleanup URL day param if present (avoid confusion)
	const params = new URLSearchParams(location.search);
	if (params.has('day')) {
		params.delete('day');
		history.replaceState(null, '', `${location.pathname}${params.toString() ? '?' + params.toString() : ''}`);
	}
}

function computeAdventBoundsFromData() {
	const keys = Object.keys(state.data ?? {})
		.map(k => parseInt(k, 10))
		.filter(n => Number.isFinite(n) && n >= 1 && n <= 31)
		.sort((a, b) => a - b);
	if (keys.length === 0) {
		state.minDay = null;
		state.maxDay = null;
		return;
	}
	state.minDay = keys[0];
	state.maxDay = keys[keys.length - 1];
}

function normalize(s) {
	return (s || '').toString().trim().toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function updateWordDisplay(input, answer, displayEl) {
	displayEl.innerHTML = '';
	const normalizedInput = normalize(input);
	const normalizedAnswer = normalize(answer);
	
	// Create boxes for each letter in the answer
	for (let i = 0; i < normalizedAnswer.length; i++) {
		const box = document.createElement('div');
		box.className = 'letter-box';
		
		if (i < normalizedInput.length) {
			const inputChar = normalizedInput[i];
			const answerChar = normalizedAnswer[i];
			box.textContent = inputChar;
			
			if (inputChar === answerChar) {
				box.classList.add('correct');
			} else {
				box.classList.add('wrong');
			}
		} else {
			box.classList.add('empty');
		}
		
		displayEl.appendChild(box);
	}
}

function checkFirstRiddle() {
	const attempt = normalize(state.currentInput);
	const correct = normalize(state.wordAnswer);
	
	if (attempt.length !== correct.length) {
		els.feedback.textContent = 'La risposta deve avere ' + correct.length + ' lettere 😊';
		els.feedback.className = 'feedback err';
		return false;
	}
	
	const ok = attempt === correct;
	els.feedback.textContent = ok ? 'Bravo! 🎉 Passa al secondo indovinello.' : 'Quasi… riprova!';
	els.feedback.className = 'feedback ' + (ok ? 'ok' : 'err');
	return ok;
}

function revealSecondRiddle() {
	els.secondRiddleSection.classList.remove('hidden');
	els.placeFeedback.textContent = '';
	els.placeFeedback.className = 'feedback';
	state.currentInput2 = '';
	els.wordInput2.value = '';
	els.wordInput2.focus();
	updateWordDisplay('', state.placeAnswer, els.wordDisplay2);
}

function checkPlace() {
	const attempt = normalize(state.currentInput2);
	const correct = normalize(state.placeAnswer);
	
	if (attempt.length !== correct.length) {
		els.placeFeedback.textContent = 'La risposta deve avere ' + correct.length + ' lettere 😊';
		els.placeFeedback.className = 'feedback err';
		return false;
	}
	
	const ok = attempt === correct;
	els.placeFeedback.textContent = ok ? 'Trovato! 🗺️ Vai a cercare lì!' : 'Mmm, non credo sia quello. Riprova!';
	els.placeFeedback.className = 'feedback ' + (ok ? 'ok' : 'err');
	return ok;
}

function hydrateDay(day) {
	// ensure message section hidden when showing a day
	if (els.messageSection) els.messageSection.classList.add('hidden');
	// ensure riddle section visible
	if (els.riddleSection) els.riddleSection.classList.remove('hidden');

	const record = state.data?.[String(day)];
	if (!record) {
		els.riddleWordText.textContent = 'Nessun indovinello disponibile per questo giorno.';
		return;
	}
	const r1 = record.indovinelloParola || 'Indovinello non disponibile';
	const a1 = (record.rispostaParola || '').toString().toUpperCase();
	const r2 = record.indovinelloLuogo || 'Indovinello luogo non disponibile';
	const a2 = (record.rispostaLuogo || '').toString().toUpperCase();

	state.wordAnswer = a1;
	state.placeAnswer = a2;

	els.riddleWordText.textContent = r1;
	els.riddlePlaceText.textContent = r2;

	// Reset inputs
	state.currentInput = '';
	state.currentInput2 = '';
	els.wordInput.value = '';
	els.wordInput2.value = '';
	els.feedback.textContent = '';
	els.feedback.className = 'feedback';
	els.placeFeedback.textContent = '';
	els.placeFeedback.className = 'feedback';
	
	// Update displays
	updateWordDisplay('', a1, els.wordDisplay);
	updateWordDisplay('', a2, els.wordDisplay2);
	
	els.secondRiddleSection.classList.add('hidden');
	els.wordInput.focus();
}

function goToDay(day) {
	state.day = day;
	setHeaderDay(day);
	hydrateDay(day);
	const params = new URLSearchParams(location.search);
	params.set('day', String(day));
	history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}

function wireEvents() {
	els.checkAnswerBtn.addEventListener('click', () => {
		if (checkFirstRiddle()) revealSecondRiddle();
	});
	
	els.resetBtn.addEventListener('click', () => {
		state.currentInput = '';
		els.wordInput.value = '';
		els.feedback.textContent = '';
		els.feedback.className = 'feedback';
		updateWordDisplay('', state.wordAnswer, els.wordDisplay);
		els.wordInput.focus();
	});
	
	els.checkPlaceBtn.addEventListener('click', checkPlace);
	
	els.resetPlaceBtn.addEventListener('click', () => {
		state.currentInput2 = '';
		els.wordInput2.value = '';
		els.placeFeedback.textContent = '';
		els.placeFeedback.className = 'feedback';
		updateWordDisplay('', state.placeAnswer, els.wordDisplay2);
		els.wordInput2.focus();
	});
	
	// Real-time input updates for first riddle
	els.wordInput.addEventListener('input', (e) => {
		state.currentInput = e.target.value.toUpperCase();
		updateWordDisplay(state.currentInput, state.wordAnswer, els.wordDisplay);
	});
	
	// Real-time input updates for second riddle
	els.wordInput2.addEventListener('input', (e) => {
		state.currentInput2 = e.target.value.toUpperCase();
		updateWordDisplay(state.currentInput2, state.placeAnswer, els.wordDisplay2);
	});
	
	// Enter key to check
	els.wordInput.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (checkFirstRiddle()) revealSecondRiddle();
		}
	});
	
	els.wordInput2.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			checkPlace();
		}
	});
}

async function init() {
	wireEvents();
	state.data = await loadData();
	computeAdventBoundsFromData();
	// No configured days
	if (state.minDay == null || state.maxDay == null) {
		showMessage('Calendario non configurato. Aggiungi giorni in data/advent.json.');
		return;
	}
	const phase = getSeasonPhase();
	if (phase !== 'during') {
		if (phase === 'before') {
			showMessage(`Ci vediamo dal ${state.minDay} dicembre! 🎄`);
		} else {
			showMessage(`Il calendario si è concluso (fino al ${state.maxDay} dicembre). Buone Feste! ✨`);
		}
	} else {
		// Allow override ONLY during 8–25
		const override = getUrlOverride();
		const today = getTodayDayOfAdvent();
		const initial = override ?? today ?? state.minDay;
		goToDay(initial);
	}
}

init();
