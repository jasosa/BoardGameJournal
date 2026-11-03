export default function GameLoading() {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        Loading the game
      </p>
      <div className="mt-15 flex items-start gap-5 md:gap-8">
        <div className="bg-raised rounded-cover aspect-3/4 w-24 shrink-0 md:w-36" />
        <div className="flex-1 space-y-3 pt-2">
          <div className="bg-raised rounded-input h-8 w-3/4" />
          <div className="bg-raised rounded-input h-4 w-1/2" />
          <div className="bg-raised rounded-input h-4 w-1/3" />
        </div>
      </div>
    </div>
  );
}
