export function Legenda() {
  return (
    <div className="flex flex-wrap gap-4 text-sm">
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm bg-orange-100 border border-orange-200" />
        <span>Reservado</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm bg-green-100 border border-green-200" />
        <span>Reserva Paga</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm bg-yellow-400" />
        <span>Feriado</span>
      </div>
    </div>
  );
}
