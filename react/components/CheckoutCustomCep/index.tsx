import React, { FC, useEffect } from 'react'
import { ISellers } from '../../typings/sellers'

const CheckoutCustomCep: FC = () => {
  const [postalCode, setPostalCode] = React.useState('')
  const [postalCodeFilled, setPostalCodeFilled] = React.useState(false)
  const [errorModal, setErrorModal] = React.useState(false)
  const [shippingData, setShippingData] = React.useState<any>(null)

  const handleInputCep = (e: React.ChangeEvent<HTMLInputElement>) => {

    let value = e.target.value

    value = value.replace(/\D/g, '')

    if (value.length > 5) {
      value = value.replace(/^(\d{5})(\d)/, '$1-$2')
    }

    if (value.length > 9) {
      value = value.slice(0, 9)
    }

    setPostalCode(value)
  }

  const resetShippingData = (orderFormId: string | undefined) => {
    if (!orderFormId) {
      console.error('OrderFormId não encontrado.')
      return
    }

    const headers = new Headers()
    headers.append('Content-Type', 'application/json')

    const body = JSON.stringify({
      clearAddressIfPostalCodeNotFound: true,
    })

    const requestOptions: RequestInit = {
      method: 'POST',
      headers,
      body,
      redirect: 'follow' as RequestRedirect,
    }

    fetch(
      `/api/checkout/pub/orderForm/${orderFormId}/attachments/shippingData`,
      requestOptions
    )
      .then(response => response.json())
      .then(data => console.log('Resposta do servidor:', data))
      .catch(error => console.error('Erro ao atualizar shippingData:', error))
  }

  const updateShippingData = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()

  const checkRegionServed = await fetch(
    `/api/checkout/pub/regions?country=BRA&postalCode=${postalCode}`
  )

  if (!checkRegionServed.ok) {
    throw new Error(`HTTP error ${checkRegionServed.status}`)
  }

  const sellersByRegion: ISellers[] = await checkRegionServed.json()
  const hasSellers = sellersByRegion[0]?.sellers?.length > 0

  if (!hasSellers) {
    setErrorModal(true)
    return
  }

  //@ts-ignore
  const orderFormId = window?.vtexjs?.checkout?.orderFormId
  if (!orderFormId) return

  const response = await fetch(
    `/api/checkout/pub/orderForm/${orderFormId}/attachments/shippingData`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        selectedAddresses: [
          {
            addressType: 'residential',
            country: 'BRA',
            postalCode,
          },
        ],
        clearAddressIfPostalCodeNotFound: true,
      }),
    }
  )

  if (!response.ok) {
    throw new Error('Erro ao atualizar shippingData')
  }

  const updatedOrderForm = await response.json()

  setShippingData(updatedOrderForm)

  //@ts-ignore
  vtexjs.checkout.getOrderForm().done(() => {})

  window.localStorage.setItem('savedPostalCode', postalCode)
  window.localStorage.setItem('userEnteredZipCode', 'true')

  document.body.classList.remove('zip-code-not-entered')
  setPostalCodeFilled(true)
}


  const resetPostalCode = () => {
  //@ts-ignore
  resetShippingData(window?.vtexjs?.checkout?.orderFormId)

  window.localStorage.setItem('userEnteredZipCode', 'false')
  window.localStorage.removeItem('savedPostalCode')

  document.body.classList.add('zip-code-not-entered')

  setPostalCodeFilled(false)
  setPostalCode('')
  setShippingData(null)
}

  useEffect(() => {
  const userEnteredZipCode =
    window.localStorage.getItem('userEnteredZipCode') === 'true'

  const savedPostalCode =
    window.localStorage.getItem('savedPostalCode')

  if (userEnteredZipCode && savedPostalCode) {
    setPostalCode(savedPostalCode)
    setPostalCodeFilled(true)
    //@ts-ignore
    vtexjs.checkout.getOrderForm().done((orderForm: any) => {
      setShippingData(orderForm)
    })
  } else {
    //@ts-ignore
    const orderFormId = window?.vtexjs?.checkout?.orderFormId
    resetShippingData(orderFormId)
  }
}, [])

  const availableSla =
  shippingData?.shippingData?.logisticsInfo?.[0]?.slas?.[1]

  const parseShippingEstimate = (estimate: string) => {
  const value = parseInt(estimate, 10)

  if (estimate.endsWith('bd')) {
    return `Até ${value} dia${value > 1 ? 's' : ''} útil${value > 1 ? 'eis' : ''}`
  }

  if (estimate.endsWith('d')) {
    return `Até ${value} dia${value > 1 ? 's' : ''} útil${value > 1 ? 'eis' : ''}`
  }

  if (estimate.endsWith('h')) {
    return `Até ${value} hora${value > 1 ? 's' : ''}`
  }

  return estimate
}
  console.log({ availableSla })

  return (
    <>
      <div className="custom-cep-container">
        {postalCodeFilled ? (
          <div className="custom-cep-form">
            <p className="custom-cep-label">
              Digite o CEP para finalizar a compra*
            </p>
            <div className="custom-cep-container-input">
              <span className="custom-ship-postal-code">{postalCode}</span>
              <button className="custom-cep-submit" onClick={resetPostalCode}>
                <span className="custom-cep-span">Alterar</span>
              </button>
            </div>
            {availableSla && (
              <div className='custom-shipping-sla'>
                <div className='custom-shipping-name-and-date'>
                  <span className='custom-shipping-name'>{availableSla.name} </span>
                    <span className='custom-shipping-date'>{parseShippingEstimate(availableSla.shippingEstimate)} </span>
                  </div> 
                  <p className='custom-shipping-price'>
                    {(availableSla.price / 100).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                  </p>
              </div>
              )}
          </div>
        ) : (
          <div>
          <form className="custom-cep-form" onSubmit={updateShippingData}>
            <label
              htmlFor="custom-ship-postalCode"
              className="custom-cep-label"
            >
              1. Digite o CEP para finalizar a compra*
            </label>
            <div className="custom-cep-container-input">
              <input
                type="text"
                className="custom-ship-postal-code"
                required
                placeholder="Digite seu CEP"
                value={postalCode}
                onChange={handleInputCep}
              />
              <button className="custom-cep-submit" type="submit">
                <span className="custom-cep-span">Calcular</span>
              </button>
            </div>
            <p className="custom-cep-alert">*Preenchimento obrigatório</p>
            <a
              className="custom-search-cep"
              href="https://buscacepinter.correios.com.br/app/endereco/index.php?t"
              target="_blank"
              rel="noopener noreferrer"
            >
              Não sei meu CEP
            </a>
          </form>
        </div>
        )}
      </div>
      {errorModal && (
        <div className="modal-zip-code-not-error-wrapper">
          <div className="modal-zip-code-not-entered-content">
            <button
              className="btn-close-modal"
              onClick={() => {
                setErrorModal(false)
                setPostalCode('')
              }}
            ></button>
            <h2>Desculpe</h2>
            <p>Ainda não atendemos a sua região</p>
            <button
              className="btn-try-again"
              onClick={() => {
                setErrorModal(false)
                setPostalCode('')
              }}
            >
              Tentar outro CEP
            </button>
          </div>

        </div>
      )}
    </>
  )
}

export default CheckoutCustomCep
