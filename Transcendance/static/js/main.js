// Fonction pour obtenir l'URL actuelle sans le domaine
// function getCurrentPath() {
//     return window.location.pathname.substring(1); // Supprimer le '/' initial
// }

const translations = {
    en: {
        play: "Play",
        local_1v1: "Local 1vs1",
        local_2v2: "Local 2vs2",
        remote_1v1: "Remote 1vs1",
        remote_2v2: "Remote 2vs2",
        language: "Language"
    },
    fr: {
        play: "Jouer",
        local_1v1: "Local 1c1",
        local_2v2: "Local 2c2",
        remote_1v1: "Distant 1c1",
        remote_2v2: "Distant 2c2",
        language: "Langue"
    },
    viet: {
        play: "Chơi",
        local_1v1: "ở gần 1t1",
        local_2v2: "ở gần 2t2",
        remote_1v1: "Khoảng 1t1",
        remote_2v2: "Khoảng 2t2",
        language: "Langue"
    }
};

// Fonction pour appliquer les traductions en fonction de la langue sélectionnée
function applyTranslations(language) {
    document.querySelector('button span').textContent = translations[language].play;
    document.querySelector('label[for="local_1v1"] span').textContent = translations[language].local_1v1;
    document.querySelector('label[for="local_2v2"] span').textContent = translations[language].local_2v2;
    document.querySelector('label[for="remote_1v1"] span').textContent = translations[language].remote_1v1;
    document.querySelector('label[for="remote_2v2"] span').textContent = translations[language].remote_2v2;
}

// Fonction pour changer la langue
function changeLanguage(language) {
    applyTranslations(language);
    localStorage.setItem('language', language); // Enregistrer la langue dans le localStorage
}

// Initialiser la langue lors du chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    const savedLanguage = localStorage.getItem('language') || 'fr'; // Français par défaut
    document.getElementById('language').value = savedLanguage;
    applyTranslations(savedLanguage); // Appliquer la traduction
});

// Écouter les changements de sélection dans le menu déroulant
document.getElementById('language').addEventListener('change', function() {
    const selectedLanguage = this.value;
    changeLanguage(selectedLanguage);
});

document.getElementById('playForm').addEventListener('submit', function(event) {
    event.preventDefault();

    // Récupération de la valeur sélectionnée
    const gameMode = document.querySelector('input[name="game_mode"]:checked').value;

    // Initialisation des variables remote et nb_players en fonction de la sélection
    let remote, nbPlayers;

    switch (gameMode) {
        case 'remote_1v1':
            remote = true;
            nbPlayers = 2;
            break;
        case 'remote_2v2':
            remote = true;
            nbPlayers = 4;
            break;
        case 'local_1v1':
            remote = false;
            nbPlayers = 2;
            break;
        case 'local_2v2':
            remote = false;
            nbPlayers = 4;
            break;
    }

    // test bonnes donnees envoyes
    console.log('Mode:', gameMode);
    console.log('Remote:', remote);
    console.log('Nb Players:', nbPlayers);

    // donnees à envoyer dans la requete
    const data = {
        remote: remote,
        nb_players: nbPlayers
    };

    // Envoi de la requête POST
    fetch(`api/play/create`, {  // mettre URL d'API
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        const gameId = result.id;
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const paddleWidth = 10, paddleHeight = 100, ballSize = 10;
        let player1Y = canvas.height / 2 - paddleHeight / 2;
        let player2Y = canvas.height / 2 - paddleHeight / 2;

        let isWPressed = false;
        let isSPressed = false;

        const paddleSpeed = 10;  // Vitesse constante de la raquette

        socket = new WebSocket(`ws://${window.location.host}/ws/game/${gameId}/`);

        socket.onmessage = function(e) {
            const data = JSON.parse(e.data);
            console.log('Received data:', data);

            const ballX = data.ball_x;
            const ballY = data.ball_y;
            player1Y = data.player1_y;
            player2Y = data.player2_y;

            draw(ballX, ballY);
        };

        socket.onclose = function(e) {
            console.error('WebSocket closed unexpectedly');
        };

        function draw(ballX, ballY) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = 'white';

            ctx.fillRect(20, player1Y, paddleWidth, paddleHeight);
            ctx.fillRect(canvas.width - 20 - paddleWidth, player2Y, paddleWidth, paddleHeight);

            ctx.beginPath();
            ctx.arc(ballX, ballY, ballSize, 0, Math.PI * 2);
            ctx.fill();
        }

        function sendPaddlePosition() {
            socket.send(JSON.stringify({ 'player1_y': player1Y }));
        }

        function updatePaddlePosition() {
            if (isWPressed) {
                player1Y = Math.max(player1Y - paddleSpeed, 0);
                sendPaddlePosition();
            } else if (isSPressed) {
                player1Y = Math.min(player1Y + paddleSpeed, canvas.height - paddleHeight);
                sendPaddlePosition();
            }
        }

        function gameLoop() {
            updatePaddlePosition();
            requestAnimationFrame(gameLoop);
        }

        document.addEventListener('keydown', function(event) {
            if (event.key === 'w') {
                isWPressed = true;
            } else if (event.key === 's') {
                isSPressed = true;
            }
        });

        document.addEventListener('keyup', function(event) {
            if (event.key === 'w') {
                isWPressed = false;
            } else if (event.key === 's') {
                isSPressed = false;
            }
        });

        gameLoop();
    })
    .catch(error => {
        console.error('Error:', error);
    });
});
