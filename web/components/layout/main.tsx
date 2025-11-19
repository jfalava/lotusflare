import React from "react";

function Main({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1">
      <div className="w-full max-w-7xl max-md:w-[94%] mx-auto">{children}</div>
    </main>
  );
}

export default Main;
