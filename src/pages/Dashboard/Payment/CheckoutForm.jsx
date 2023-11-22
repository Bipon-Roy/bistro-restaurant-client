import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useEffect, useState } from "react";
import useAxiosSecure from "../../../hooks/useAxiosSecure";
import useCart from "../../../hooks/useCart";
import useAuth from "../../../hooks/useAuth";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

const CheckoutForm = () => {
    const stripe = useStripe();
    const elements = useElements();
    const [error, setError] = useState("");
    const [clientSecret, setClientSecret] = useState("");
    const axiosSecure = useAxiosSecure();
    const { user } = useAuth();
    const [cart, refetch] = useCart();
    const [transactionId, setTransactionId] = useState("");
    const navigate = useNavigate();

    const totalPrice = cart.reduce((total, item) => total + item.price, 0);

    useEffect(() => {
        if (totalPrice > 0) {
            axiosSecure.post("/create-payment-intent", { price: totalPrice }).then((res) => {
                console.log(res.data.clientSecret);
                setClientSecret(res.data.clientSecret);
            });
        }
    }, [axiosSecure, totalPrice]);
    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!stripe || !elements) {
            // Stripe.js has not loaded yet. Make sure to disable
            // form submission until Stripe.js has loaded.
            return;
        }

        const card = elements.getElement(CardElement);

        if (card == null) {
            return;
        }
        // Use your card Element with other Stripe.js APIs
        const { error, paymentMethod } = await stripe.createPaymentMethod({
            type: "card",
            card,
        });

        if (error) {
            console.log("[error]", error);
            setError(error.message);
        } else {
            console.log("[PaymentMethod]", paymentMethod);
            setError("");
        }

        //confirm payment

        const { paymentIntent, error: confirmError } = await stripe.confirmCardPayment(
            clientSecret,
            {
                payment_method: {
                    card: card,
                    billing_details: {
                        email: user?.email || "anonymous",
                        name: user?.displayName || "anonymous",
                    },
                },
            }
        );

        if (confirmError) {
            console.log("confirm error");
        }
        if (paymentIntent) {
            console.log("Payment Intent", paymentIntent);
            if (paymentIntent.status === "succeeded") {
                setTransactionId(paymentIntent.id);
            }

            //save payment info into the database
            const payment = {
                email: user.email,
                price: totalPrice,
                transactionId: paymentIntent.id,
                date: new Date(), // utc date convert. use moment js to
                cartIds: cart.map((item) => item._id),
                menuItemIds: cart.map((item) => item.menuId),
                status: "pending",
            };
            const res = await axiosSecure.post("/payments", payment);
            console.log("payment saved", res.data);
            refetch();
            if (res.data?.paymentResult?.insertedId) {
                Swal.fire({
                    position: "top-end",
                    icon: "success",
                    title: "Thank you for the Payment",
                    showConfirmButton: false,
                    timer: 1500,
                });
                navigate("/dashboard/paymentHistory");
            }
        }
    };
    return (
        <form onSubmit={handleSubmit}>
            <CardElement
                options={{
                    style: {
                        base: {
                            fontSize: "16px",
                            color: "#424770",
                            "::placeholder": {
                                color: "#aab7c4",
                            },
                        },
                        invalid: {
                            color: "#9e2146",
                        },
                    },
                }}
            />
            <button
                className="btn btn-sm btn-primary mt-4"
                type="submit"
                disabled={!stripe || !clientSecret}
            >
                Pay
            </button>
            <p className="text-red-600 my-2">{error}</p>

            {transactionId && (
                <p className="text-green-600 my-2">Your Transaction Id: {transactionId}</p>
            )}
        </form>
    );
};

export default CheckoutForm;
