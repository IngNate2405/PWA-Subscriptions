document.addEventListener('DOMContentLoaded', async function() {
    const app = document.getElementById('app');
    const addButton = document.getElementById('add-button');
    
    // Agregar el encabezado con el botón de tema
    const header = document.createElement('div');
    header.className = 'header';
    
    const title = document.createElement('h1');
    title.id = 'main-title';
    title.textContent = 'Mis Suscripciones';
    
    const themeButton = document.createElement('button');
    themeButton.className = 'theme-button';
    themeButton.innerHTML = '🌙';
    themeButton.onclick = toggleTheme;
    
    title.appendChild(themeButton);
    header.appendChild(title);
    document.body.insertBefore(header, app);

    // Función para cambiar el tema
    function toggleTheme() {
        const isDark = document.body.classList.toggle('dark-theme');
        themeButton.innerHTML = isDark ? '☀️' : '🌙';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    // Cargar el tema guardado
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
        themeButton.innerHTML = '☀️';
    }

    let subscriptions = [];
    let db;

    // Configuración de IndexedDB
    const dbName = 'subscriptionsDB';
    const dbVersion = 1;

    // Inicializar la base de datos
    const initDB = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, dbVersion);

            request.onerror = (event) => {
                console.error('Error al abrir la base de datos:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                console.log('Base de datos abierta exitosamente');
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('subscriptions')) {
                    db.createObjectStore('subscriptions', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    };

    // Funciones CRUD para IndexedDB
    const dbOperations = {
        getAllSubscriptions: () => {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['subscriptions'], 'readonly');
                const store = transaction.objectStore('subscriptions');
                const request = store.getAll();

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        },

        addSubscription: (subscription) => {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['subscriptions'], 'readwrite');
                const store = transaction.objectStore('subscriptions');
                const request = store.add(subscription);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        },

        updateSubscription: (subscription) => {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['subscriptions'], 'readwrite');
                const store = transaction.objectStore('subscriptions');
                const request = store.put(subscription);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        },

        deleteSubscription: (id) => {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['subscriptions'], 'readwrite');
                const store = transaction.objectStore('subscriptions');
                const request = store.delete(id);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        },

        updateSubscriptionsOrder: (subscriptions) => {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['subscriptions'], 'readwrite');
                const store = transaction.objectStore('subscriptions');
                
                // Primero eliminamos todas las suscripciones
                store.clear().onsuccess = () => {
                    // Luego las agregamos en el nuevo orden
                    let completed = 0;
                    subscriptions.forEach((sub) => {
                        store.add(sub).onsuccess = () => {
                            completed++;
                            if (completed === subscriptions.length) {
                                resolve();
                            }
                        };
                    });
                };
                
                transaction.onerror = () => reject(transaction.error);
            });
        }
    };

    // Inicializar la aplicación
    async function initApp() {
        try {
            await initDB();
            subscriptions = await dbOperations.getAllSubscriptions();
            displaySubscriptions();
        } catch (error) {
            console.error('Error al inicializar la aplicación:', error);
        }
    }

    // Inicializar la aplicación antes de configurar los eventos
    await initApp();

    // Modificar el evento del botón de agregar
    addButton.addEventListener('click', function() {
        showNewSubscriptionForm();
    });

    function showNewSubscriptionForm() {
        toggleAddButton(false);
        app.innerHTML = '';
        
        // Crear una suscripción vacía temporal
        const emptySubscription = {
            name: '',
            usdPrice: 0,
            members: [],
            frequency: 'Mensual',
            logo: 'default-logo.png'
        };

        const details = document.createElement('div');
        details.className = 'details';

        // Crear el encabezado con logo editable
        const detailsHeader = document.createElement('div');
        detailsHeader.className = 'details-header';
        
        const logoContainer = document.createElement('div');
        logoContainer.className = 'logo-container';
        
        const logo = document.createElement('img');
        logo.className = 'card-logo';
        logo.src = 'default-logo.png';
        logo.alt = 'Logo de nueva suscripción';
        
        // Agregar menú de opciones para la imagen
        const logoMenu = document.createElement('div');
        logoMenu.className = 'logo-menu';
        
        const changeImageBtn = document.createElement('button');
        changeImageBtn.className = 'logo-option';
        changeImageBtn.textContent = 'Cambiar imagen';
        changeImageBtn.onclick = (e) => {
            e.stopPropagation();
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        logo.src = e.target.result;
                        emptySubscription.logo = e.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
            logoMenu.style.display = 'none';
        };

        const removeImageBtn = document.createElement('button');
        removeImageBtn.className = 'logo-option';
        removeImageBtn.textContent = 'Quitar imagen';
        removeImageBtn.onclick = (e) => {
            e.stopPropagation();
            logo.src = 'default-logo.png';
            emptySubscription.logo = null;
            logoMenu.style.display = 'none';
        };

        logoMenu.appendChild(changeImageBtn);
        logoMenu.appendChild(removeImageBtn);
        
        logoContainer.appendChild(logo);
        logoContainer.appendChild(logoMenu);
        
        // Título editable
        const title = document.createElement('h2');
        title.className = 'card-title editable';
        title.contentEditable = true;
        title.textContent = 'Nueva Suscripción';
        title.dataset.placeholder = 'Nombre de la aplicación';
        
        detailsHeader.appendChild(logoContainer);
        detailsHeader.appendChild(title);
        details.appendChild(detailsHeader);

        // Crear campos editables
        const createEditRow = (label, value, id, type = 'text') => {
            const row = document.createElement('div');
            row.className = 'edit-row';
            const input = document.createElement('input');
            input.type = type;
            input.value = value;
            input.className = 'edit-input';
            input.id = id;
            input.placeholder = label;
            
            row.innerHTML = `<span class="edit-label">${label}</span>`;
            row.appendChild(input);
            return row;
        };

        // Añadir campos editables
        details.appendChild(createEditRow('Precio USD:', '', 'edit-price', 'number'));
        
        // Agregar selector de frecuencia
        const frequencyRow = document.createElement('div');
        frequencyRow.className = 'edit-row';
        const frequencySelect = document.createElement('select');
        frequencySelect.className = 'edit-input';
        frequencySelect.id = 'edit-frequency';
        
        const frequencies = [
            { value: 'Mensual', label: 'Mensual' },
            { value: 'Trimestral', label: 'Trimestral' },
            { value: 'Semestral', label: 'Semestral' },
            { value: 'Anual', label: 'Anual' }
        ];
        
        frequencies.forEach(freq => {
            const option = document.createElement('option');
            option.value = freq.value;
            option.textContent = freq.label;
            frequencySelect.appendChild(option);
        });
        
        frequencyRow.innerHTML = `<span class="edit-label">Frecuencia:</span>`;
        frequencyRow.appendChild(frequencySelect);
        details.appendChild(frequencyRow);
        
        // Mostrar precio en GTQ (se actualizará automáticamente)
        const gtqRow = document.createElement('div');
        gtqRow.className = 'price-row';
        gtqRow.innerHTML = `
            <span class="price-label">Precio GTQ:</span>
            <span class="price-value" id="gtq-price">Q0.00</span>
        `;
        details.appendChild(gtqRow);

        // Campo para total debitado
        details.appendChild(createEditRow('Total debitado GTQ:', '', 'edit-total', 'number'));

        // Contenedor para botones
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'buttons-container';

        // Botón Guardar
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Guardar';
        saveButton.className = 'save-button';
        saveButton.onclick = async () => {
            const name = title.textContent;
            const usdPrice = parseFloat(document.getElementById('edit-price').value);
            const totalDebited = parseFloat(document.getElementById('edit-total').value);
            const frequency = document.getElementById('edit-frequency').value;

            if (!name || name === 'Nueva Suscripción' || !usdPrice) {
                alert('Por favor completa al menos el nombre y el precio USD');
                return;
            }

            const newSubscription = {
                name: name,
                usdPrice: usdPrice,
                totalDebited: totalDebited || (usdPrice * 8),
                frequency: frequency,
                members: [],
                logo: emptySubscription.logo
            };

            try {
                await dbOperations.addSubscription(newSubscription);
                subscriptions = await dbOperations.getAllSubscriptions();
                displaySubscriptions();
            } catch (error) {
                console.error('Error al agregar la suscripción:', error);
                alert('Hubo un error al agregar la suscripción');
            }
        };

        // Botón Cancelar
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancelar';
        cancelButton.className = 'cancel-button';
        cancelButton.onclick = () => {
            displaySubscriptions();
        };

        // Añadir botones al contenedor
        buttonsContainer.appendChild(saveButton);
        buttonsContainer.appendChild(cancelButton);
        details.appendChild(buttonsContainer);

        // Agregar sección de miembros
        const membersSection = document.createElement('div');
        membersSection.className = 'members-section';

        const membersTitle = document.createElement('h3');
        membersTitle.textContent = 'Miembros';
        membersTitle.className = 'members-title';
        membersSection.appendChild(membersTitle);

        // Total de miembros
        const totalMembersRow = document.createElement('div');
        totalMembersRow.className = 'members-total-row';
        totalMembersRow.innerHTML = `
            <span class="members-label">Total miembros</span>
            <span class="members-count">0</span>
        `;
        membersSection.appendChild(totalMembersRow);

        // Lista de miembros (vacía inicialmente)
        const membersList = document.createElement('div');
        membersList.className = 'members-list';
        membersSection.appendChild(membersList);

        // Botón agregar nuevo miembro
        const addMemberButton = document.createElement('button');
        addMemberButton.textContent = 'Agregar nuevo miembro';
        addMemberButton.className = 'add-member-button';
        addMemberButton.onclick = () => showMemberForm(emptySubscription);
        membersSection.appendChild(addMemberButton);

        details.appendChild(membersSection);
        app.appendChild(details);

        // Manejar el cambio de imagen y eventos
        logo.onclick = (e) => {
            e.stopPropagation();
            logoMenu.style.display = logoMenu.style.display === 'flex' ? 'none' : 'flex';
        };

        // Actualizar precio GTQ automáticamente cuando cambie el precio USD
        const priceInput = document.getElementById('edit-price');
        if (priceInput) {
            priceInput.addEventListener('input', (e) => {
                const usdPrice = parseFloat(e.target.value) || 0;
                const gtqPrice = document.getElementById('gtq-price');
                if (gtqPrice) {
                    gtqPrice.textContent = `Q${(usdPrice * 8).toFixed(2)}`;
                }
            });
        }

        // Cerrar el menú del logo cuando se hace clic fuera
        document.addEventListener('click', (e) => {
            if (!logoContainer.contains(e.target)) {
                logoMenu.style.display = 'none';
            }
        });
    }

    function toggleAddButton(show) {
        const addButton = document.getElementById('add-button');
        if (addButton) {
            addButton.style.display = show ? 'block' : 'none';
        }
    }

    function displaySubscriptions() {
        toggleAddButton(true);
        app.innerHTML = '';
        
        // Mostrar las suscripciones existentes
        subscriptions.forEach((sub, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.draggable = true;

            // Crear el encabezado de la tarjeta con logo y título
            const cardHeader = document.createElement('div');
            cardHeader.className = 'card-header';
            
            const logo = document.createElement('img');
            logo.className = 'card-logo';
            logo.src = sub.logo || 'default-logo.png';
            logo.alt = `${sub.name} logo`;
            
            const titleContainer = document.createElement('div');
            titleContainer.className = 'title-container';
            
            const title = document.createElement('h2');
            title.className = 'card-title';
            title.textContent = sub.name;
            
            // Agregar botón de eliminar
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-subscription-button';
            deleteButton.innerHTML = '🗑️';
            deleteButton.onclick = async (e) => {
                e.stopPropagation(); // Evitar que se abra la vista de detalles
                if (confirm('¿Estás seguro de que deseas eliminar esta suscripción? Esta acción no se puede deshacer.')) {
                    try {
                        await dbOperations.deleteSubscription(sub.id);
                        subscriptions = await dbOperations.getAllSubscriptions();
                        displaySubscriptions();
                    } catch (error) {
                        console.error('Error al eliminar la suscripción:', error);
                        alert('Hubo un error al eliminar la suscripción');
                    }
                }
            };
            
            titleContainer.appendChild(title);
            titleContainer.appendChild(deleteButton);
            
            // Agregar botón de toggle
            const toggleButton = document.createElement('button');
            toggleButton.className = 'toggle-button';
            toggleButton.innerHTML = '▼';
            toggleButton.onclick = (e) => {
                e.stopPropagation();
                const content = card.querySelector('.card-content');
                const isVisible = content.style.display !== 'none';
                content.style.display = isVisible ? 'none' : 'block';
                toggleButton.innerHTML = isVisible ? '▼' : '▲';
            };
            cardHeader.appendChild(toggleButton);
            
            cardHeader.appendChild(logo);
            cardHeader.appendChild(titleContainer);
            
            card.appendChild(cardHeader);

            // Crear contenedor para el contenido que se puede ocultar
            const cardContent = document.createElement('div');
            cardContent.className = 'card-content';

            // Crear las filas de precios
            const createPriceRow = (label, value) => {
                const row = document.createElement('div');
                row.className = 'price-row';
                row.innerHTML = `
                    <span class="price-label">${label}</span>
                    <span class="price-value">${value}</span>
                `;
                return row;
            };

            // Añadir las filas de precios con el factor de conversión actualizado a 8
            cardContent.appendChild(createPriceRow('Precio USD:', `$${sub.usdPrice.toFixed(2)}`));
            cardContent.appendChild(createPriceRow('Precio GTQ:', `Q${(sub.usdPrice * 8).toFixed(2)}`));
            cardContent.appendChild(createPriceRow('Total miembros:', sub.members.length));
            cardContent.appendChild(createPriceRow('Frecuencia:', sub.frequency || 'Mensual'));

            // Calcular el total recibido (suma de pagos de miembros)
            const totalRecibido = sub.members.reduce((total, member) => {
                if (!member.payment) return total;
                // Convertir el pago a mensual según la frecuencia
                let pagoMensual = member.payment;
                switch (member.frequency) {
                    case 'Anual':
                        pagoMensual = member.payment / 12;
                        break;
                    case 'Trimestral':
                        pagoMensual = member.payment / 3;
                        break;
                    case 'Semestral':
                        pagoMensual = member.payment / 6;
                        break;
                }
                return total + pagoMensual;
            }, 0);

            cardContent.appendChild(createPriceRow('Total recibido mensual:', `Q${totalRecibido.toFixed(2)}`));

            // Usar el total debitado guardado o calcular basado en el precio USD
            const totalDebitado = sub.totalDebited || (sub.usdPrice * 8);
            cardContent.appendChild(createPriceRow('Total debitado GTQ:', `Q${totalDebitado.toFixed(2)}`));

            card.appendChild(cardContent);

            // Añadir eventos
            card.onclick = () => showDetails(sub);
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', index);
            });
            
            app.appendChild(card);
        });

        // Mantener el código existente para drag and drop
        app.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(app, e.clientY);
            const draggable = document.querySelector('.dragging');
            if (afterElement == null) {
                app.appendChild(draggable);
            } else {
                app.insertBefore(draggable, afterElement);
            }
        });

        app.addEventListener('drop', (e) => {
            const startIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const endIndex = [...app.childNodes].indexOf(getDragAfterElement(app, e.clientY));
            reorderArray(startIndex, endIndex);
            displaySubscriptions();
        });
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    async function reorderArray(startIndex, endIndex) {
        const [reorderedItem] = subscriptions.splice(startIndex, 1);
        subscriptions.splice(endIndex, 0, reorderedItem);
        
        try {
            await dbOperations.updateSubscriptionsOrder(subscriptions);
            subscriptions = await dbOperations.getAllSubscriptions();
        } catch (error) {
            console.error('Error al reordenar las suscripciones:', error);
        }
    }

    function showDetails(subscription) {
        toggleAddButton(false);
        app.innerHTML = '';
        const details = document.createElement('div');
        details.className = 'details';

        // Crear el encabezado con logo editable
        const detailsHeader = document.createElement('div');
        detailsHeader.className = 'details-header';
        
        const logoContainer = document.createElement('div');
        logoContainer.className = 'logo-container';
        
        const logo = document.createElement('img');
        logo.className = 'card-logo';
        logo.src = subscription.logo || 'default-logo.png';
        logo.alt = `${subscription.name} logo`;
        
        // Agregar menú de opciones para la imagen
        const logoMenu = document.createElement('div');
        logoMenu.className = 'logo-menu';
        
        const changeImageBtn = document.createElement('button');
        changeImageBtn.className = 'logo-option';
        changeImageBtn.textContent = 'Cambiar imagen';
        changeImageBtn.onclick = (e) => {
            e.stopPropagation();
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        logo.src = e.target.result;
                        subscription.logo = e.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
            logoMenu.style.display = 'none';
        };

        const removeImageBtn = document.createElement('button');
        removeImageBtn.className = 'logo-option';
        removeImageBtn.textContent = 'Quitar imagen';
        removeImageBtn.onclick = (e) => {
            e.stopPropagation();
            logo.src = 'default-logo.png';
            subscription.logo = null;
            logoMenu.style.display = 'none';
        };

        logoMenu.appendChild(changeImageBtn);
        logoMenu.appendChild(removeImageBtn);
        
        logoContainer.appendChild(logo);
        logoContainer.appendChild(logoMenu);
        
        // Título editable
        const title = document.createElement('h2');
        title.className = 'card-title editable';
        title.contentEditable = true;
        title.textContent = subscription.name;
        
        detailsHeader.appendChild(logoContainer);
        detailsHeader.appendChild(title);
        details.appendChild(detailsHeader);

        // Crear campos editables
        const createEditRow = (label, value, id, type = 'text') => {
            const row = document.createElement('div');
            row.className = 'edit-row';
            const input = document.createElement('input');
            input.type = type;
            input.value = value;
            input.className = 'edit-input';
            input.id = id;
            
            row.innerHTML = `<span class="edit-label">${label}</span>`;
            row.appendChild(input);
            return row;
        };

        // Añadir campos editables
        details.appendChild(createEditRow('Precio USD:', subscription.usdPrice, 'edit-price', 'number'));
        
        // Agregar selector de frecuencia
        const frequencyRow = document.createElement('div');
        frequencyRow.className = 'edit-row';
        const frequencySelect = document.createElement('select');
        frequencySelect.className = 'edit-input';
        frequencySelect.id = 'edit-frequency';
        
        const frequencies = [
            { value: 'Mensual', label: 'Mensual' },
            { value: 'Trimestral', label: 'Trimestral' },
            { value: 'Semestral', label: 'Semestral' },
            { value: 'Anual', label: 'Anual' }
        ];
        
        frequencies.forEach(freq => {
            const option = document.createElement('option');
            option.value = freq.value;
            option.textContent = freq.label;
            option.selected = subscription.frequency === freq.value;
            frequencySelect.appendChild(option);
        });
        
        frequencyRow.innerHTML = `<span class="edit-label">Frecuencia:</span>`;
        frequencyRow.appendChild(frequencySelect);
        details.appendChild(frequencyRow);
        
        // Mostrar precio en GTQ (no editable, se actualiza automáticamente)
        const gtqRow = document.createElement('div');
        gtqRow.className = 'price-row';
        gtqRow.innerHTML = `
            <span class="price-label">Precio GTQ:</span>
            <span class="price-value" id="gtq-price">Q${(subscription.usdPrice * 8).toFixed(2)}</span>
        `;
        details.appendChild(gtqRow);

        // Campo para total debitado
        details.appendChild(createEditRow('Total debitado GTQ:', subscription.totalDebited || (subscription.usdPrice * 8), 'edit-total', 'number'));

        // Contenedor para botones
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'buttons-container';

        // Botón Guardar
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Guardar';
        saveButton.className = 'save-button';
        saveButton.onclick = async () => {
            const index = subscriptions.findIndex(s => s.id === subscription.id);
            if (index !== -1) {
                const updatedSubscription = {
                    ...subscription,
                    name: title.textContent,
                    usdPrice: parseFloat(document.getElementById('edit-price').value),
                    totalDebited: parseFloat(document.getElementById('edit-total').value),
                    frequency: document.getElementById('edit-frequency').value
                };

                try {
                    await dbOperations.updateSubscription(updatedSubscription);
                    subscriptions = await dbOperations.getAllSubscriptions();
                    toggleAddButton(true);
                    displaySubscriptions();
                } catch (error) {
                    console.error('Error al actualizar la suscripción:', error);
                }
            }
        };

        // Botón Cancelar
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancelar';
        cancelButton.className = 'cancel-button';
        cancelButton.onclick = () => {
            toggleAddButton(true);
            displaySubscriptions();
        };

        // Añadir botones al contenedor
        buttonsContainer.appendChild(saveButton);
        buttonsContainer.appendChild(cancelButton);
        details.appendChild(buttonsContainer);

        // Agregar sección de miembros
        const membersSection = document.createElement('div');
        membersSection.className = 'members-section';

        const membersTitle = document.createElement('h3');
        membersTitle.textContent = 'Miembros';
        membersTitle.className = 'members-title';
        membersSection.appendChild(membersTitle);

        // Total de miembros
        const totalMembersRow = document.createElement('div');
        totalMembersRow.className = 'members-total-row';
        totalMembersRow.innerHTML = `
            <span class="members-label">Total miembros</span>
            <span class="members-count">${subscription.members.length}</span>
        `;
        membersSection.appendChild(totalMembersRow);

        // Lista de miembros
        const membersList = document.createElement('div');
        membersList.className = 'members-list';
        
        subscription.members.forEach(member => {
            const memberItem = createMemberListItem(member, subscription);
            membersList.appendChild(memberItem);
        });
        membersSection.appendChild(membersList);

        // Botón agregar nuevo miembro
        const addMemberButton = document.createElement('button');
        addMemberButton.textContent = 'Agregar nuevo miembro';
        addMemberButton.className = 'add-member-button';
        addMemberButton.onclick = () => showMemberForm(subscription);
        membersSection.appendChild(addMemberButton);

        details.appendChild(membersSection);
        app.appendChild(details);

        // Manejar el cambio de imagen y eventos
        logo.onclick = (e) => {
            e.stopPropagation();
            logoMenu.style.display = logoMenu.style.display === 'flex' ? 'none' : 'flex';
        };

        // Actualizar precio GTQ automáticamente cuando cambie el precio USD
        const priceInput = document.getElementById('edit-price');
        if (priceInput) {
            priceInput.addEventListener('input', (e) => {
                const usdPrice = parseFloat(e.target.value) || 0;
                const gtqPrice = document.getElementById('gtq-price');
                if (gtqPrice) {
                    gtqPrice.textContent = `Q${(usdPrice * 8).toFixed(2)}`;
                }
            });
        }

        // Cerrar el menú del logo cuando se hace clic fuera
        document.addEventListener('click', (e) => {
            if (!logoContainer.contains(e.target)) {
                logoMenu.style.display = 'none';
            }
        });
    }

    function createMemberListItem(member, subscription) {
        const item = document.createElement('div');
        item.className = 'member-item';
        
        const memberInfo = document.createElement('div');
        memberInfo.className = 'member-info';
        
        // Crear el texto de los meses pagados
        let mesesPagados = '';
        if (member.paymentPeriod === 'first-semester') {
            mesesPagados = 'Ene - Jun';
        } else if (member.paymentPeriod === 'second-semester') {
            mesesPagados = 'Jul - Dic';
        } else if (member.selectedMonths?.length > 0) {
            mesesPagados = member.selectedMonths.join(', ');
        }

        memberInfo.innerHTML = `
            <div class="member-details">
                <span class="member-name">${member.name}</span>
                <span class="member-months">${mesesPagados}</span>
            </div>
            <div class="member-payment-info">
                <span class="member-payment">Q${member.payment?.toFixed(2) || '0.00'}</span>
                ${member.isPaid ? '<span class="member-status paid">✓</span>' : ''}
            </div>
        `;
        
        // Agregar botón de eliminar
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-member-button';
        deleteButton.innerHTML = '🗑️';
        deleteButton.onclick = (e) => {
            e.stopPropagation(); // Evitar que se abra el formulario de edición
            if (confirm('¿Estás seguro de que deseas eliminar este miembro?')) {
                const index = subscription.members.findIndex(m => m.name === member.name);
                if (index !== -1) {
                    subscription.members.splice(index, 1);
                    showDetails(subscription);
                }
            }
        };
        
        item.appendChild(memberInfo);
        item.appendChild(deleteButton);
        memberInfo.onclick = () => showMemberForm(subscription, member);
        
        return item;
    }

    function showMemberForm(subscription, existingMember = null) {
        // Mantener el botón oculto cuando se muestra el formulario de miembros
        toggleAddButton(false);
        
        const memberForm = document.createElement('div');
        memberForm.className = 'member-form';

        const formTitle = document.createElement('h3');
        formTitle.textContent = existingMember ? 'Editar Miembro' : 'Nuevo Miembro';
        memberForm.appendChild(formTitle);

        // Crear formulario
        const form = document.createElement('form');
        form.innerHTML = `
            <div class="form-group">
                <label for="memberName">Nombre miembro</label>
                <input type="text" id="memberName" value="${existingMember?.name || ''}" required>
            </div>
            
            <div class="form-group">
                <label for="memberPayment">Pago (Q)</label>
                <input type="number" id="memberPayment" value="${existingMember?.payment || ''}" required step="0.01" min="0">
            </div>

            <div class="form-group">
                <label for="paymentFrequency">Frecuencia de Pago</label>
                <select id="paymentFrequency" required>
                    <option value="Mensual" ${existingMember?.frequency === 'Mensual' ? 'selected' : ''}>Mensual</option>
                    <option value="Trimestral" ${existingMember?.frequency === 'Trimestral' ? 'selected' : ''}>Trimestral</option>
                    <option value="Semestral" ${existingMember?.frequency === 'Semestral' ? 'selected' : ''}>Semestral</option>
                    <option value="Anual" ${existingMember?.frequency === 'Anual' ? 'selected' : ''}>Anual</option>
                </select>
            </div>

            <div class="form-group">
                <label>Meses pagados</label>
                <div class="payment-period-options">
                    <div class="radio-group">
                        <label>
                            <input type="radio" name="paymentPeriod" value="first-semester" ${existingMember?.paymentPeriod === 'first-semester' ? 'checked' : ''}>
                            Ene - Jun
                        </label>
                        <label>
                            <input type="radio" name="paymentPeriod" value="second-semester" ${existingMember?.paymentPeriod === 'second-semester' ? 'checked' : ''}>
                            Jul - Dic
                        </label>
                        <label>
                            <input type="radio" name="paymentPeriod" value="custom" ${existingMember?.paymentPeriod === 'custom' ? 'checked' : ''}>
                            Selección múltiple
                        </label>
                    </div>
                    <div id="monthsSelection" class="months-selection" style="display: none;">
                        ${['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
                            .map((month, index) => `
                                <label>
                                    <input type="checkbox" 
                                        value="${month}" 
                                        ${existingMember?.selectedMonths?.includes(month) ? 'checked' : ''}>
                                    ${month}
                                </label>
                            `).join('')}
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label>Método de pago</label>
                <div class="payment-methods">
                    <label>
                        <input type="checkbox" value="paid" ${existingMember?.paymentMethods?.includes('paid') ? 'checked' : ''}>
                        Pagado
                    </label>
                    <label>
                        <input type="checkbox" value="card" ${existingMember?.paymentMethods?.includes('card') ? 'checked' : ''}>
                        En tarjeta
                    </label>
                    <label>
                        <input type="checkbox" value="cash" ${existingMember?.paymentMethods?.includes('cash') ? 'checked' : ''}>
                        Efectivo
                    </label>
                </div>
            </div>
            
            <div class="form-buttons">
                <button type="submit" class="save-button">Guardar</button>
                <button type="button" class="cancel-button">Cancelar</button>
            </div>
        `;

        // Agregar el evento para mostrar/ocultar la selección de meses
        const radioButtons = form.querySelectorAll('input[name="paymentPeriod"]');
        const monthsSelection = form.querySelector('#monthsSelection');
        
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'custom') {
                    monthsSelection.style.display = 'flex';
                } else {
                    monthsSelection.style.display = 'none';
                }
            });
        });

        // Si ya tenía selección múltiple, mostrar la sección
        if (existingMember?.paymentPeriod === 'custom') {
            monthsSelection.style.display = 'flex';
        }

        // Actualizar el onsubmit para incluir los meses pagados
        form.onsubmit = (e) => {
            e.preventDefault();
            const paymentPeriod = form.querySelector('input[name="paymentPeriod"]:checked').value;
            let selectedMonths = [];
            
            if (paymentPeriod === 'first-semester') {
                selectedMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
            } else if (paymentPeriod === 'second-semester') {
                selectedMonths = ['Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            } else if (paymentPeriod === 'custom') {
                selectedMonths = Array.from(form.querySelectorAll('#monthsSelection input:checked'))
                    .map(checkbox => checkbox.value);
            }

            const memberData = {
                name: form.querySelector('#memberName').value,
                payment: parseFloat(form.querySelector('#memberPayment').value),
                frequency: form.querySelector('#paymentFrequency').value,
                paymentMethods: Array.from(form.querySelectorAll('.payment-methods input:checked')).map(cb => cb.value),
                isPaid: form.querySelector('input[value="paid"]').checked,
                paymentPeriod: paymentPeriod,
                selectedMonths: selectedMonths
            };

            if (existingMember) {
                const index = subscription.members.findIndex(m => m.name === existingMember.name);
                if (index !== -1) {
                    subscription.members[index] = memberData;
                }
            } else {
                if (!subscription.members) {
                    subscription.members = [];
                }
                subscription.members.push(memberData);
            }

            showDetails(subscription);
        };

        form.querySelector('.cancel-button').onclick = () => {
            showDetails(subscription);
        };

        memberForm.appendChild(form);
        app.innerHTML = '';
        app.appendChild(memberForm);
    }

    function showMemberDetails(member) {
        // Reutilizamos el formulario de miembro pero con los datos existentes
        showMemberForm(subscription, member);
    }

    function calculatePayment(basePrice, frequency) {
        switch (frequency) {
            case 'Mensual':
                return basePrice;
            case 'Trimestral':
                return basePrice * 3;
            case 'Anual':
                return basePrice * 12;
            default:
                return basePrice;
        }
    }

    displaySubscriptions();
}); 