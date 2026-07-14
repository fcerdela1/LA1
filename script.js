document.addEventListener('DOMContentLoaded', () => {
    // ---- INITIALISATION DE LA BASE DE DONNÉES LOCALES ----
    let db = {
        joueurs: [],
        entrainements: [],
        matchs: [],
        presencesEntrainements: {},
        presencesMatchs: {}
    };

    try {
        const localData = localStorage.getItem('fc_erde_db');
        if (localData) {
            db = JSON.parse(localData);
        }
    } catch (e) {
        console.error("Erreur de lecture du localStorage:", e);
    }

    function saveDB() {
        try {
            localStorage.setItem('fc_erde_db', JSON.stringify(db));
        } catch (e) {
            console.error("Erreur d'écriture dans le localStorage:", e);
        }
        refreshAll();
    }

    // ---- SYSTÈME DE NAVIGATION ENTRE ONGLETS ----
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabs = document.querySelectorAll('.tab');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTabId = button.getAttribute('data-target');
            if (!targetTabId) return;

            navButtons.forEach(btn => btn.classList.remove('active'));
            tabs.forEach(tab => tab.classList.add('hidden'));

            button.classList.add('active');
            const targetTab = document.getElementById(targetTabId);
            if (targetTab) targetTab.classList.remove('hidden');
        });
    });

    // ---- GESTION DU CHANGEMENT DE COULEUR DES APPRÉCIATIONS (SELECTS) ----
    document.body.addEventListener('change', (e) => {
        if (e.target && e.target.classList.contains('presence-select')) {
            e.target.setAttribute('data-val', e.target.value);
        }
    });

    // ---- SYSTÈME SIMPLIFIÉ DE CONNEXION ADMIN ----
    const btnLogin = document.getElementById('btnSubmitLogin');
    const btnLogout = document.getElementById('btnSubmitLogout');
    const passwordInput = document.getElementById('adminPassword');
    const loginForm = document.getElementById('loginForm');
    const logoutForm = document.getElementById('logoutForm');
    const btnNavAuth = document.getElementById('btnNavAuth');

    const ADMIN_PASSWORD = "admin"; 
    let isAdmin = false;

    function updateAdminUI() {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = isAdmin ? 'block' : 'none';
        });
    }

    if (btnLogin) {
        btnLogin.addEventListener('click', () => {
            if (passwordInput && passwordInput.value === ADMIN_PASSWORD) {
                isAdmin = true;
                if (loginForm) loginForm.classList.add('hidden');
                if (logoutForm) logoutForm.classList.remove('hidden');
                if (btnNavAuth) {
                    btnNavAuth.classList.add('logged');
                    btnNavAuth.innerHTML = "🔓 Admin connecté";
                }
                if (passwordInput) passwordInput.value = "";
                updateAdminUI();
                refreshAll();
            } else {
                alert("Mot de passe incorrect ! (Indice par défaut : admin)");
            }
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            isAdmin = false;
            if (loginForm) loginForm.classList.remove('hidden');
            if (logoutForm) logoutForm.classList.add('hidden');
            if (btnNavAuth) {
                btnNavAuth.classList.remove('logged');
                btnNavAuth.innerHTML = "🔒 Modifications";
            }
            updateAdminUI();
            refreshAll();
        });
    }

    // ---- AJOUT DES JOUEURS ----
    const btnAjouterJoueur = document.getElementById('btnAjouterJoueur');
    if (btnAjouterJoueur) {
        btnAjouterJoueur.addEventListener('click', () => {
            const nomEl = document.getElementById('jNom');
            const posteEl = document.getElementById('jPoste');
            const licenceEl = document.getElementById('jLicence');

            if (!nomEl || !nomEl.value.trim()) return alert("Le nom du joueur est requis.");

            db.joueurs.push({
                id: 'j_' + Date.now(),
                nom: nomEl.value.trim(),
                poste: posteEl ? posteEl.value : 'Milieu',
                licence: (licenceEl && licenceEl.value.trim()) ? licenceEl.value.trim() : 'N/C'
            });

            if (nomEl) nomEl.value = '';
            if (licenceEl) licenceEl.value = '';
            saveDB();
        });
    }

    window.supprimerJoueur = function(id) {
        if (!isAdmin) return alert("Droits insuffisants.");
        if (confirm("Supprimer ce joueur de l'effectif ?")) {
            db.joueurs = db.joueurs.filter(j => j.id !== id);
            saveDB();
        }
    };

    // ---- AJOUT ENTRAÎNEMENTS & MATCHS ----
    const btnAjouterEntrainement = document.getElementById('btnAjouterEntrainement');
    if (btnAjouterEntrainement) {
        btnAjouterEntrainement.addEventListener('click', () => {
            const dateEl = document.getElementById('eDate');
            const lieuEl = document.getElementById('eLieu');
            const commEl = document.getElementById('eCommentaire');
            
            if (!dateEl || !lieuEl || !dateEl.value || !lieuEl.value.trim()) return alert("Date et lieu requis.");

            db.entrainements.push({ 
                id: 'e_' + Date.now(), 
                date: dateEl.value, 
                lieu: lieuEl.value.trim(), 
                commentaire: commEl ? commEl.value.trim() : '' 
            });
            saveDB();
        });
    }

    const btnAjouterMatch = document.getElementById('btnAjouterMatch');
    if (btnAjouterMatch) {
        btnAjouterMatch.addEventListener('click', () => {
            const dateEl = document.getElementById('mDate');
            const advEl = document.getElementById('mAdversaire');
            const lieuEl = document.getElementById('mLieu');
            const scoreEl = document.getElementById('mScore');
            
            if (!dateEl || !advEl || !dateEl.value || !advEl.value.trim()) return alert("Date et adversaire requis.");

            db.matchs.push({ 
                id: 'm_' + Date.now(), 
                date: dateEl.value, 
                adversaire: advEl.value.trim(), 
                lieu: lieuEl ? lieuEl.value : 'Domicile', 
                score: scoreEl ? scoreEl.value.trim() : '' 
            });
            saveDB();
        });
    }

    window.supprimerSeance = function(type, id) {
        if (!isAdmin) return alert("Droits insuffisants.");
        if (confirm("Supprimer cette séance ?")) {
            if (type === 'E') db.entrainements = db.entrainements.filter(e => e.id !== id);
            if (type === 'M') db.matchs = db.matchs.filter(m => m.id !== id);
            saveDB();
        }
    };

    // ---- FONCTION STATISTIQUES CALCULÉES ----
    function calculerStatsJoueur(joueurId) {
        let stats = { P: 0, A: 0, B: 0, E: 0, NC: 0 };
        db.entrainements.forEach(e => { stats[db.presencesEntrainements[`${joueurId}_${e.id}`] || 'NC']++; });
        db.matchs.forEach(m => { stats[db.presencesMatchs[`${joueurId}_${m.id}`] || 'NC']++; });
        const evalues = stats.P + stats.A + stats.B + stats.E;
        stats.taux = evalues > 0 ? Math.round((stats.P / evalues) * 100) : 0;
        return stats;
    }

    // ---- RENDU DYNAMIQUE DES INTERFACES ----
    function refreshAll() {
        refreshDashboard();
        refreshEffectif();
        refreshGrilles('E');
        refreshGrilles('M');
        refreshProfils();
    }

    function refreshDashboard() {
        const elJ = document.getElementById('dashCountJoueurs');
        const elE = document.getElementById('dashCountEntraînements');
        const elM = document.getElementById('dashCountMatchs');
        const elT = document.getElementById('dashTauxPresence');
        
        if (elJ) elJ.innerText = db.joueurs.length;
        if (elE) elE.innerText = db.entrainements.length;
        if (elM) elM.innerText = db.matchs.length;

        const tbody = document.getElementById('tbodyDashboard');
        if (!tbody) return;
        tbody.innerHTML = '';
        let totalP = 0, totalPoids = 0;

        db.joueurs.forEach(j => {
            const s = calculerStatsJoueur(j.id);
            totalP += s.P;
            totalPoids += (s.P + s.A + s.B + s.E);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${j.nom}</strong></td>
                <td><span class="badge poste">${j.poste}</span></td>
                <td><strong>${s.taux}%</strong></td>
                <td>
                    <span class="stat-P">P:${s.P}</span> | <span class="stat-A">A:${s.A}</span> | 
                    <span class="stat-B">B:${s.B}</span> | <span class="stat-E">E:${s.E}</span> | 
                    <span class="stat-NC">NC:${s.NC}</span>
                </td>
            `;
            tbody.appendChild(tr);
        });
        if (elT) elT.innerText = totalPoids > 0 ? Math.round((totalP / totalPoids) * 100) + '%' : '0%';
    }

    function refreshEffectif() {
        const tbody = document.getElementById('tbodyEffectif');
        if (!tbody) return;
        tbody.innerHTML = '';
        db.joueurs.forEach(j => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${j.nom}</td>
                <td><span class="badge poste">${j.poste}</span></td>
                <td>${j.licence}</td>
                <td><button class="delete" onclick="supprimerJoueur('${j.id}')">Supprimer</button></td>
            `;
            tbody.appendChild(tr);
        });
    }

    function refreshGrilles(type) {
        const isE = type === 'E';
        const headRow = document.getElementById(isE ? 'theadEntrainementsRow' : 'theadMatchsRow');
        const tbody = document.getElementById(isE ? 'tbodyEntrainements' : 'tbodyMatchs');
