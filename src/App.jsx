import { useState, useEffect, useRef } from "react";
import "./App.css";

// El componente Square no necesita cambios.
function Square({ value, onSquareClick }) {
    return (
        <button className="square" onClick={onSquareClick}>
            {value}
        </button>
    );
}

// El componente Board no necesita cambios.
function Board({ xIsNext, squares, onPlay }) {
    function handleClick(i) {
        if (calculateWinner(squares) || squares[i]) {
            return;
        }
        const nextSquares = squares.slice();
        if (xIsNext) {
            nextSquares[i] = "X";
        } else {
            nextSquares[i] = "O";
        }
        onPlay(nextSquares);
    }

    const winner = calculateWinner(squares);
    let status;
    if (winner) {
        status = "Ganador: " + winner;
    } else if (squares.every((square) => square !== null)) {
        status = "Empate";
    } else {
        status = "Siguiente jugador: " + (xIsNext ? "X" : "O");
    }

    const boardRows = [];
    for (let row = 0; row < 3; row++) {
        const squaresInRow = [];
        for (let col = 0; col < 3; col++) {
            const i = row * 3 + col;
            squaresInRow.push(
                <Square
                    key={i}
                    value={squares[i]}
                    onSquareClick={() => handleClick(i)}
                />
            );
        }
        boardRows.push(
            <div key={row} className="board-row">
                {squaresInRow}
            </div>
        );
    }

    return (
        <>
            <div className="status">{status}</div>
            {boardRows}
        </>
    );
}

// Componente principal del juego con la lógica de WebSocket mejorada.
export default function Game() {
    const [history, setHistory] = useState([Array(9).fill(null)]);
    const [currentMove, setCurrentMove] = useState(0);
    const ws = useRef(null);

    const xIsNext = currentMove % 2 === 0;
    const currentSquares = history[currentMove]; // Siempre usa el estado actual

    // Función para enviar el estado actual al servidor
    const sendGameState = (newHistory, newCurrentMove) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            const gameState = {
                history: newHistory,
                currentMove: newCurrentMove,
            };
            ws.current.send(JSON.stringify(gameState));
        }
    };

    useEffect(() => {
        ws.current = new WebSocket("ws://localhost:8080");

        ws.current.onopen = () =>
            console.log("Conectado al servidor WebSocket");
        ws.current.onclose = () =>
            console.log("Desconectado del servidor WebSocket");
        ws.current.onerror = (error) =>
            console.error("Error en WebSocket:", error);

        // El listener ahora es la ÚNICA fuente de verdad para actualizar el estado
        ws.current.onmessage = (event) => {
            const receivedState = JSON.parse(event.data);
            console.log("Estado recibido del servidor:", receivedState);
            setHistory(receivedState.history);
            setCurrentMove(receivedState.currentMove);
        };

        return () => {
            if (ws.current) ws.current.close();
        };
    }, []);

    function handlePlay(nextSquares) {
        // Calcula el nuevo estado pero no lo aplica localmente todavía
        const newHistory = [...history.slice(0, currentMove + 1), nextSquares];
        const newCurrentMove = newHistory.length - 1;
        // Envía el nuevo estado para que el servidor lo distribuya
        sendGameState(newHistory, newCurrentMove);
    }

    function jumpTo(move) {
        // En lugar de actualizar el estado local, envía el estado deseado al servidor
        sendGameState(history, move);
    }

    function handleReset() {
        // Crea el estado inicial y lo envía al servidor
        const initialHistory = [Array(9).fill(null)];
        const initialMove = 0;
        sendGameState(initialHistory, initialMove);
    }

    const moves = history.map((squares, move) => {
        const description =
            move > 0 ? `Ir al movimiento #${move}` : `Ir al inicio del juego`;
        return (
            <li key={move}>
                <button onClick={() => jumpTo(move)}>{description}</button>
            </li>
        );
    });

    return (
        <div className="game">
            <div className="game-board">
                <Board
                    xIsNext={xIsNext}
                    squares={currentSquares}
                    onPlay={handlePlay}
                />
            </div>
            <div className="game-info">
                {/* Botón para reiniciar el juego */}
                <button onClick={handleReset}>Nuevo Juego</button>
                <h3>Historial de Movimientos</h3>
                <ol>{moves}</ol>
            </div>
        </div>
    );
}

function calculateWinner(squares) {
    const lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
        const [a, b, c] = lines[i];
        if (
            squares[a] &&
            squares[a] === squares[b] &&
            squares[a] === squares[c]
        ) {
            return squares[a];
        }
    }
    return null;
}
