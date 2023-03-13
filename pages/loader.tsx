'use client';
type LoaderProps = {
    processName?: string
}
const Loader = ({processName}: LoaderProps) => {
    return (
        <>        
    <div className="flex items-center justify-center ">
        <div className="w-16 h-16 border-b-2 border-white rounded-full animate-spin"></div>
    </div>
   {processName && <div className="font-bold mint-btn text-white">{processName}</div>}
        </>
    );
}

export default Loader;
 
