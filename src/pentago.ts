
class PentagoView {
	private boardViews:BoardView[][];
	private currentPlayer:HTMLElement;
	private phase:HTMLElement;

	constructor(private model:Pentago, private container:HTMLElement) {
		this.boardViews = [];
		for(let x=0; x < model.size; x++) {
			let row:BoardView[] = [];
			for(let y=0; y < model.size; y++) {
				row.push(new BoardView(model.getBoard(x,y)));
			}
			this.boardViews.push(row);
		}
		this.build();

		this.model.listen(()=>this.update());
	}

	private build(){
		this.container.innerHTML = '';
		this.container.classList.add('pentago');
		let status = document.createElement('div');
		this.container.appendChild(status);
		status.className = 'status';
		this.currentPlayer = document.createElement('div');
		this.phase = document.createElement('div');
		this.phase.innerText = 'place';
		this.phase.className = 'phase';
		this.currentPlayer.className = 'tile player-1';
		status.appendChild(this.currentPlayer);
		status.appendChild(this.phase);
		for(let y=0; y < this.model.size; y++) {
			let row = document.createElement('div');
			row.classList.add('pentago-row');
			for(let x=0; x < this.model.size; x++) {
				row.appendChild(this.boardViews[x][y].render());
			}
			this.container.appendChild(row);
		}
	}

	update() {
		this.currentPlayer.className = `tile player-${this.model.getPlayer()}`;
		this.phase.innerText = this.model.getPhase();
		if(this.model.isOver()) {
			this.currentPlayer.className = `tile player-${this.model.getWinner()}`
			this.phase.innerText = 'Winner!';
		}
		for(let x=0; x < this.model.size; x++) {
			for(let y=0; y < this.model.size; y++) {
				this.boardViews[x][y].update();
			}
		}
	}
}

class BoardView {
	private container:HTMLElement;
	private tiles:{[key:string]:HTMLElement};
	constructor(private model:Board) {
		this.model.listenRotate(clockwise=>this._rotate(clockwise))
	}

	private rotate(clockwise:boolean) {
		if(!this.model.canRotate()) return;
		this.model.rotate(clockwise);
	}
	private _rotate(clockwise:boolean){
		this.update();
		this.container.style.transition = '';
		requestAnimationFrame(() => {
			this.container.style.transform = `rotate(${clockwise ? -90 : 90}deg)`;
			requestAnimationFrame(() => {
				this.container.style.transition = '1s all';
				requestAnimationFrame(()=>{
					this.container.style.transform = '';
				});
			});
		});
	}

	update(){
		for(let x=0; x < this.model.size; x++){
			for(let y=0; y < this.model.size; y++){
				this.tiles[`${x},${y}`].className = `tile player-${this.model.getPiece(x,y)}`;
			}
		}
	}

	render():HTMLElement {
		this.container = document.createElement('div');
		this.container.classList.add('board');

		this.tiles = {};

		for(let y=0; y < this.model.size; y++) {
			let row = document.createElement('div');
			row.classList.add('board-row');
			for(let x=0; x < this.model.size; x++) {
				let tile = document.createElement('div');
				this.tiles[x+','+y] = tile;
				tile.addEventListener('click', () => {
					if(this.model.canPlace()) {
						if(this.model.isEmpty(x,y)){
							this.model.placePiece(x,y);
						}
					} else { //rotate
						if(y == 0) {
							if(x == 0) {
								this.rotate(false);
							}
							if(x == this.model.size -1) {
								this.rotate(true);
							}
						}
					}
				});
				tile.classList.add('tile');
				tile.className = `tile player-${this.model.getPiece(x,y)}`;
				row.appendChild(tile);
			}
			this.container.appendChild(row);
		}	

		return this.container;
	}
}

type TurnPhase = 'place'|'rotate';

class Pentago {
	private boards:Board[][];
	private turn:number = 1;
	private numPlayers = 2;
	private over:boolean = false;

	private tileWidth:number;

	private turnPhase:TurnPhase = 'place';

	private callbacks:(()=>void)[] = [];

	constructor(
		public size:number = 2, 
	){
		this.boards = [];
		for(let x=0; x < size; x++) {
			let row:Board[] = [];
			for(let y=0; y < size; y++) {
				row.push(new Board(this));
			}
			this.boards.push(row);
		}
		this.tileWidth = this.size*this.boards[0][0].size;
	}

	private changed() {
		this.callbacks.forEach(cb => cb());
	}

	listen(cb:()=>void) {
		this.callbacks.push(cb);
	}

	private getPiece(x:number,y:number):number {
		let boardSize = this.boards[0][0].size;
		let board = this.boards[Math.floor(x/boardSize)][Math.floor(y/boardSize)];
		return board.getPiece(x % boardSize, y % boardSize);
	}

	private countInDirection(x:number,y:number,dx:number,dy:number):number {
		let player = this.getPiece(x,y);
		let count = 1;
		let curX = x + dx;
		let curY = y + dy;
		if(dx == 0 && dy == 0) return 0;
		while(true) {
			if(!(curX >= 0 && curX < this.tileWidth && curY >= 0 && curY < this.tileWidth)) {
				return count;
			}
			if(this.getPiece(curX, curY) == player) {
				count++;
			} else {
				return count;
			}
			curX+=dx;
			curY+=dy;
		}
	}

	getWinner():number {
		for(let y=0; y < this.tileWidth; y++) {
			for(let x=0; x < this.tileWidth; x++) {
				let player = this.getPiece(x,y);
				if(player != 0) {
					if(this.countInDirection(x,y,1,0) >= 5) {
						return player;
					}
					if(this.countInDirection(x,y,0,1) >= 5) {
						return player;
					}
					if(this.countInDirection(x,y,1,1) >= 5) {
						return player;
					}
					if(this.countInDirection(x,y,-1,1) >= 5) {
						return player;
					}
				}
			}
		}
		return 0;
	}

	isOver():boolean {
		if(!this.over && this.getWinner() != 0) {
			this.over = true;
			this.changed();
		}
		return this.over;
	}

	nextPhase() {
		this.turnPhase = this.turnPhase == 'place' ? 'rotate' : 'place'; 
		this.changed();
	}

	getPhase():TurnPhase {
		return this.turnPhase;
	}

	getPlayer() {
		return this.turn;
	}

	switchPlayer() {
		this.turn++;
		this.turnPhase = 'place';
		if(this.turn > this.numPlayers) {
			this.turn = 1;
		}
		this.changed();
	}

	getBoard(x:number,y:number) {
		return this.boards[x][y];
	}

}



class Board {
	private grid:number[][];

	private onRotate:((clockwise:boolean)=>void)[] = [];

	constructor(
		private game:Pentago,
		public size:number = 3
	){
		this.grid = [];
		for(let x=0; x < size; x++) {
			let row:number[] = [];
			for(let y=0; y < size; y++) {
				row.push(0);
			}
			this.grid.push(row);
		}
	}

	listenRotate(cb:(clockwise:boolean)=>void) {
		this.onRotate.push(cb);
	}

	canPlace() {
		return this.game.getPhase() == 'place' && !this.game.isOver();
	}

	canRotate() {
		return this.game.getPhase() == 'rotate' && !this.game.isOver();
	}

	isEmpty(x:number,y:number) {
		return this.grid[x][y] === 0;
	}

	placePiece(x:number, y:number) {
		if(!this.canPlace()) return;
		this.grid[x][y] = this.game.getPlayer();
		this.game.nextPhase();
	}

	getPiece(x:number, y:number) {
		return this.grid[x][y];
	}

	rotate(clockwise:boolean) {
		if(!this.canRotate()) return;
		let newGrid:number[][] = [];
		for(let x=0; x < this.size; x++) {
			let row:number[] = [];
			for(let y=0; y < this.size; y++) {
				if(!clockwise) {
					row.push(this.grid[this.size-1-y][x]);
				} else {
					row.push(this.grid[y][this.size-1-x]);
				}
			}
			newGrid.push(row);
		}
		this.grid = newGrid;
		this.onRotate.forEach(cb => cb(clockwise));
		this.game.switchPlayer();
	}
}

