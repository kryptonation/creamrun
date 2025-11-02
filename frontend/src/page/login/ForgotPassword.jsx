import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext'
import React, { useState } from 'react'

const ForgotPassword = () => {
    const [username, setUsername] = useState('');
    const handleSubmit = () => {
        return
    };
    return (
        <div className='form-container d-flex flex-column align-items-start gap-3'>
            <span className='sigin-text'>Forgot Password</span>
            <form onSubmit={handleSubmit}  data-testid="forgot-form" className="form d-flex flex-column align-items-start gap-3">
                <div className="p-field">
                    <InputText
                        id="username"
                        data-testid="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter username"
                        required
                    />
                </div>
                <Button id="SignIn"  data-testid="Sign In" label="Sign In" icon="pi pi-sign-in" className="p-mt-3 text-white " />
            </form>
        </div>
    )
}

export default ForgotPassword