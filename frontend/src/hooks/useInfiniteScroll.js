import { useCallback, useRef, useState } from "react";

export const useInfiniteScroll = ({totalPages}) => {
  const observerRef = useRef(null);
  const loadingRef = useRef(false); 
  const [page, setPage] = useState(1);

  const resetPage=useCallback(()=>{
   return setPage(1);
  },[])
  
  const lastElementRef=useCallback((node)=>{
    if(observerRef.current) observerRef.current.disconnect();
      observerRef.current=new IntersectionObserver(entries=>{
        console.log(entries[0].isIntersecting);
        // if()
        if(entries[0].isIntersecting&& !loadingRef.current&&totalPages>page){
           loadingRef.current = true;
          setPage((prevPage) => prevPage + 1);
        }
    },{
      threshold:0.1
    })
    if(node)observerRef.current.observe(node);
  },[totalPages,page]);
  const handleDataLoaded = useCallback(() => {
    loadingRef.current = false;
  }, []);
  return { page, lastElementRef, resetPage,handleDataLoaded  };
};
