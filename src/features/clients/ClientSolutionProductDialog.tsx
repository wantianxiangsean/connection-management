import { useState, type FormEvent } from 'react'
import { DialogFrame } from '../../components/DialogFrame'
import type { ClientArtifact } from '../../domain/types'

export function ClientSolutionProductDialog({
  solutionName,
  products,
  onClose,
  onSave,
}: {
  solutionName: string
  products: ClientArtifact[]
  onClose: () => void
  onSave: (productId: string) => void
}) {
  const [productId, setProductId] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (productId) onSave(productId)
  }

  return (
    <DialogFrame
      title="挂产品"
      overline={`方案 · ${solutionName}`}
      onClose={onClose}
    >
      <form className="stack-form" onSubmit={submit}>
        <div className="solution-product-picker">
          <span className="solution-product-picker-title">
            选择客户下已有的产品
          </span>
          {products.length ? (
            <ul className="solution-product-options">
              {products.map((product) => (
                <li key={product.id}>
                  <label className="checkbox-row">
                    <input
                      type="radio"
                      name="solution-product"
                      checked={productId === product.id}
                      onChange={() => setProductId(product.id)}
                    />
                    <span>{product.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="client-section-empty">
              客户下还没有可以挂的产品，请先在产品里新增。
            </p>
          )}
        </div>
        <footer>
          <button type="button" className="button ghost" onClick={onClose}>
            取消
          </button>
          <button
            type="submit"
            className="button primary"
            disabled={!productId}
          >
            挂上
          </button>
        </footer>
      </form>
    </DialogFrame>
  )
}
