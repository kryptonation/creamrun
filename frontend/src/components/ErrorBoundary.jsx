import React from "react";
import ErrorComponent from "./ErrorComponent";

class ErrorBoundary extends React.Component {
    constructor(props){
        super(props);
        this.state={hasError:false,error:undefined};
    }
    static getDerivedStateFromError(error){
        return {hasError:true,error}
    }
    componentDidCatch(error,info){
        console.log(error,info);
    }
    render(){
        if(this.state.hasError){
            return <ErrorComponent error={this.state.error?.message || ""}></ErrorComponent>;
        }
        return this.props.children;
    }
}
export default ErrorBoundary;
