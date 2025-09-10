"use client"

import { useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useProductNavigation } from "@/hooks/use-product-navigation"

interface ProductPaginationProps {
  currentPage: number;
  totalPages: number;
}

export function ProductPagination({ currentPage, totalPages }: ProductPaginationProps) {
  const { navigateToProducts } = useProductNavigation();
  const searchParams = useSearchParams();
  
  const handlePageChange = (page: number) => {
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    navigateToProducts({ category, search, page });
  };
  return (
    <div className="flex items-center justify-between mt-8">
      <div className="text-sm text-muted-foreground">
        {totalPages > 0 
          ? `Page ${currentPage} of ${totalPages}`
          : 'No results found'}
      </div>

      <div className="flex items-center space-x-2">
      <Button 
        variant="outline" 
        size="sm" 
        disabled={currentPage <= 1}
        onClick={() => handlePageChange(currentPage - 1)}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Previous
      </Button>
      <div className="flex items-center space-x-1">
          {totalPages > 0 && [...Array(Math.min(5, totalPages))].map((_, i) => {
            const pageNumber = i + 1;
            return (
              <Button
                key={pageNumber}
                variant={pageNumber === currentPage ? "default" : "outline"}
                size="sm"
                className={pageNumber === currentPage ? "bg-accent text-accent-foreground" : ""}
                onClick={() => handlePageChange(pageNumber)}
              >
                {pageNumber}
              </Button>
            );
          })}
          {totalPages > 5 && (
            <>
              <span className="px-2 text-muted-foreground">...</span>
              <Button
                variant={totalPages === currentPage ? "default" : "outline"}
                size="sm"
                className={totalPages === currentPage ? "bg-accent text-accent-foreground" : ""}
                onClick={() => handlePageChange(totalPages)}
              >
                {totalPages}
              </Button>
            </>
          )}
        </div>

        <Button 
          variant="outline" 
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => handlePageChange(currentPage + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
