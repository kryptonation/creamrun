import { useRef } from 'react';
import { Outlet } from 'react-router-dom';
import ImageCar from '../../assets/img_car.png';
import ImageLogo from '../../assets/img_logo.png';
import BToast from '../../components/BToast'
import { Carousel } from 'primereact/carousel';
import '../login/auth.css';

const Login = () => {
    const toast = useRef(null);

    const productTemplate = () => {
        return (
            <div className="brand-wrapper">
                <span className="brand-text">Drive With <br />Big Apple Taxi</span>
                <span className="brand-message">Simplify Operations, Maximize Efficiency</span>
            </div>
        );
    };

    const products = [{
        id: '1000',
        code: 'f230fh0g3',
        name: 'Bamboo Watch',
        description: 'Product Description',
        image: 'bamboo-watch.jpg',
        price: 65,
        category: 'Accessories',
        quantity: 24,
        inventoryStatus: 'INSTOCK',
        rating: 5
    }, {
        id: '1000',
        code: 'f230fh0g3',
        name: 'Bamboo Watch',
        description: 'Product Description',
        image: 'bamboo-watch.jpg',
        price: 65,
        category: 'Accessories',
        quantity: 24,
        inventoryStatus: 'INSTOCK',
        rating: 5
    }, {
        id: '1000',
        code: 'f230fh0g3',
        name: 'Bamboo Watch',
        description: 'Product Description',
        image: 'bamboo-watch.jpg',
        price: 65,
        category: 'Accessories',
        quantity: 24,
        inventoryStatus: 'INSTOCK',
        rating: 5
    }];

    return (
        <div className="login-page-container" >
            <div className='container-sec'>
                <div className='container-left position-relative d-flex align-items-center flex-column'>
                    <Carousel value={products} numVisible={1} numScroll={1} className="custom-carousel" circular
                        itemTemplate={productTemplate} autoplayInterval={3000}  nextIcon={() => false} prevIcon={() => false} />
                    <img className="car-image" src={ImageCar} alt="" />
                </div>
                <div className='container-right'>
                    <Outlet></Outlet>
                </div>
            </div>

            <img className="logo-image" src={ImageLogo} alt="" />
            <BToast ref={toast} position='top-right' />
        </div>
    );
};

export default Login;
