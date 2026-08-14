export function SkeletonLoader({ type = "default" }: { type?: "default" | "dashboard" | "products" | "product-detail" | "messages" }) {
  if (type === "dashboard") {
    return (
      <div className="w-full space-y-6">
        <div className="space-y-2">
          <div className="shimmer h-8 w-48" />
          <div className="shimmer h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="border border-border p-5">
              <div className="shimmer h-3 w-20 mb-2" />
              <div className="shimmer h-8 w-24 mb-1" />
              <div className="shimmer h-2 w-16" />
            </div>
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 border border-border p-5 space-y-3">
            <div className="shimmer h-4 w-32 mb-4" />
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3">
                <div className="shimmer h-8 w-8" />
                <div className="flex-1 space-y-2">
                  <div className="shimmer h-3 w-1/2" />
                  <div className="shimmer h-2 w-1/3" />
                </div>
              </div>
            ))}
          </div>
          <div className="border border-border p-5 space-y-3">
            <div className="shimmer h-4 w-20 mb-4" />
            <div className="shimmer h-8 w-8 mb-3" />
            <div className="shimmer h-3 w-24 mb-2" />
            <div className="shimmer h-2 w-16" />
          </div>
        </div>
      </div>
    )
  }

  if (type === "products") {
    return (
      <div className="w-full space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <div className="shimmer h-8 w-40" />
            <div className="shimmer h-4 w-24" />
          </div>
          <div className="shimmer h-8 w-20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="border border-border overflow-hidden">
              <div className="aspect-[4/3] shimmer" />
              <div className="p-5 space-y-3">
                <div className="shimmer h-4 w-2/3" />
                <div className="shimmer h-3 w-1/2" />
                <div className="flex justify-between items-center pt-2">
                  <div className="shimmer h-6 w-20" />
                  <div className="shimmer h-8 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === "product-detail") {
    return (
      <div className="w-full grid md:grid-cols-2 gap-6 items-center">
        <div className="space-y-2">
          <div className="aspect-square shimmer" />
          <div className="flex gap-2">
            <div className="shimmer h-12 w-12" />
            <div className="shimmer h-12 w-12" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="shimmer h-4 w-20" />
          <div className="shimmer h-8 w-3/4" />
          <div className="shimmer h-4 w-full" />
          <div className="shimmer h-4 w-2/3" />
          <div className="shimmer h-8 w-24" />
          <div className="flex gap-4 pt-4">
            <div className="shimmer h-6 w-20" />
            <div className="shimmer h-6 w-16" />
          </div>
          <div className="space-y-2 pt-4">
            <div className="shimmer h-10 w-full" />
            <div className="shimmer h-10 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (type === "messages") {
    return (
      <div className="w-full space-y-6">
        <div className="space-y-2">
          <div className="shimmer h-8 w-32" />
          <div className="shimmer h-4 w-48" />
        </div>
        <div className="shimmer h-10 w-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="border border-border p-4 flex items-center gap-3">
              <div className="shimmer h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="shimmer h-4 w-32" />
                <div className="shimmer h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // default: centered card skeleton
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md space-y-4">
        <div className="shimmer h-8 w-3/4" />
        <div className="shimmer h-4 w-full" />
        <div className="shimmer h-4 w-5/6" />
        <div className="shimmer h-10 w-full mt-4" />
      </div>
    </div>
  )
}
