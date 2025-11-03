export type Producto = {
	id: number;
	tipo: string;
	nombre: string;
	precio: number;
	descripcion: string;
	cm3?: number;
	baja: boolean;
    id_carta: number;
}
