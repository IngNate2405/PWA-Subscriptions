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
            logo: 'default-logo.jpg'
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
        changeImageBtn.textContent = 'Agregar/Cambiar imagen';
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
            { value: 'Anuall', label: 'Anual' }
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
        
        // Obtener los estados guardados de los toggles
        let toggleStates = JSON.parse(localStorage.getItem('toggleStates') || '{}');
        
        // Mostrar las suscripciones existentes
        subscriptions.forEach((sub, index) => {
            const card = document.createElement('div');
            card.className = 'card';

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
                e.stopPropagation();
                if (confirm('¿Estás seguro de que deseas eliminar esta suscripción? Esta acción no se puede deshacer.')) {
                    try {
                        await dbOperations.deleteSubscription(sub.id);
                        // Eliminar el estado del toggle cuando se elimina la suscripción
                        delete toggleStates[sub.id];
                        localStorage.setItem('toggleStates', JSON.stringify(toggleStates));
                        subscriptions = await dbOperations.getAllSubscriptions();
                        displaySubscriptions();
                    } catch (error) {
                        console.error('Error al eliminar la suscripción:', error);
                        alert('Hubo un error al eliminar la suscripción');
                    }
                }
            };
            
            // Agregar botón de toggle
            const toggleButton = document.createElement('button');
            toggleButton.className = 'toggle-button';
            toggleButton.innerHTML = toggleStates[sub.id] ? '▲' : '▼';
            toggleButton.onclick = (e) => {
                e.stopPropagation();
                const content = card.querySelector('.card-content');
                const isVisible = content.style.display !== 'none';
                content.style.display = isVisible ? 'none' : 'block';
                toggleButton.innerHTML = isVisible ? '▼' : '▲';
                // Guardar el estado del toggle
                toggleStates[sub.id] = !isVisible;
                localStorage.setItem('toggleStates', JSON.stringify(toggleStates));
            };
            cardHeader.appendChild(toggleButton);
            
            titleContainer.appendChild(title);
            titleContainer.appendChild(deleteButton);
            
            cardHeader.appendChild(logo);
            cardHeader.appendChild(titleContainer);
            
            card.appendChild(cardHeader);

            // Crear contenedor para el contenido que se puede ocultar
            const cardContent = document.createElement('div');
            cardContent.className = 'card-content';
            // Establecer el estado inicial del contenido basado en el estado guardado
            cardContent.style.display = toggleStates[sub.id] ? 'block' : 'none';

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
            
            app.appendChild(card);
        });
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
        changeImageBtn.textContent = 'Agregar/Cambiar imagen';
        changeImageBtn.onclick = (e) => {
            e.stopPropagation();
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                e.stopPropagation();
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
                    id: subscription.id,
                    name: title.textContent,
                    usdPrice: parseFloat(document.getElementById('edit-price').value),
                    totalDebited: parseFloat(document.getElementById('edit-total').value),
                    frequency: document.getElementById('edit-frequency').value,
                    members: subscription.members.map(member => ({
                        ...member,
                        receiptImages: member.receiptImages || []
                    }))
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
        toggleAddButton(false);
        
        const memberForm = document.createElement('div');
        memberForm.className = 'member-form';

        const formTitle = document.createElement('h3');
        formTitle.textContent = existingMember ? 'Editar Miembro' : 'Nuevo Miembro';
        memberForm.appendChild(formTitle);

        const form = document.createElement('form');
        
        // Campos del formulario (mantener los campos existentes)
        form.innerHTML = `
            <div class="form-group">
                <label for="memberName">Nombre:</label>
                <input type="text" id="memberName" value="${existingMember?.name || ''}" required>
            </div>
            <div class="form-group">
                <label for="memberPayment">Pago (GTQ):</label>
                <input type="number" id="memberPayment" value="${existingMember?.payment || ''}" required>
            </div>
            <div class="form-group">
                <label for="paymentFrequency">Frecuencia de pago:</label>
                <select id="paymentFrequency">
                    <option value="Mensual" ${existingMember?.frequency === 'Mensual' ? 'selected' : ''}>Mensual</option>
                    <option value="Trimestral" ${existingMember?.frequency === 'Trimestral' ? 'selected' : ''}>Trimestral</option>
                    <option value="Semestral" ${existingMember?.frequency === 'Semestral' ? 'selected' : ''}>Semestral</option>
                    <option value="Anual" ${existingMember?.frequency === 'Anual' ? 'selected' : ''}>Anual</option>
                </select>
            </div>
            <div class="form-group">
                <label>Período de pago:</label>
                <div class="radio-group">
                    <label>
                        <input type="radio" name="paymentPeriod" value="first-semester" ${existingMember?.paymentPeriod === 'first-semester' ? 'checked' : ''}>
                        Primer semestre (Ene - Jun)
                    </label>
                    <label>
                        <input type="radio" name="paymentPeriod" value="second-semester" ${existingMember?.paymentPeriod === 'second-semester' ? 'checked' : ''}>
                        Segundo semestre (Jul - Dic)
                    </label>
                    <label>
                        <input type="radio" name="paymentPeriod" value="custom" ${existingMember?.paymentPeriod === 'custom' ? 'checked' : ''}>
                        Meses específicos
                    </label>
                </div>
                <div id="monthsSelection" style="display: none">
                    ${['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
                        .map(month => `
                            <label>
                                <input type="checkbox" value="${month}" ${existingMember?.selectedMonths?.includes(month) ? 'checked' : ''}>
                                ${month}
                            </label>
                        `).join('')}
                </div>
            </div>
            <div class="form-group">
                <label>Método de pago:</label>
                <div class="payment-methods">
                    <label>
                        <input type="checkbox" value="cash" ${existingMember?.paymentMethods?.includes('cash') ? 'checked' : ''}>
                        Efectivo
                    </label>
                    <label>
                        <input type="checkbox" value="transfer" ${existingMember?.paymentMethods?.includes('transfer') ? 'checked' : ''}>
                        Transferencia
                    </label>
                </div>
            </div>
            <div class="form-group">
                <label>Estado de pago:</label>
                <div class="radio-group">
                    <label>
                        <input type="radio" name="paymentStatus" value="paid" ${existingMember?.isPaid ? 'checked' : ''}>
                        Pagado
                    </label>
                    <label>
                        <input type="radio" name="paymentStatus" value="pending" ${!existingMember?.isPaid ? 'checked' : ''}>
                        Pendiente
                    </label>
                </div>
            </div>
            <div class="form-group">
                <label>Comprobantes de pago:</label>
                <div class="receipt-container">
                    <div class="receipt-spaces"></div>
                    <button type="button" class="add-receipt-button">+</button>
                </div>
            </div>
            <div class="form-group">
                <label>Comentarios:</label>
                <div class="comments-section">
                    <div class="comment-input-container">
                        <textarea id="new-comment" placeholder="Escribe un comentario..." class="comment-input"></textarea>
                        <button type="button" class="add-comment-button">Agregar</button>
                    </div>
                    <div class="comments-list"></div>
                </div>
            </div>
            <div class="buttons-container">
                <button type="submit" class="save-button">Guardar</button>
                <button type="button" class="cancel-button">Cancelar</button>
            </div>
        `;

        // Función para crear un espacio de recibo con un menú desplegable
        function createReceiptSpace(imageSrc = 'default-receipt.png') {
            const space = document.createElement('div');
            space.className = 'receipt-space';
            space.style.position = 'relative';

            const image = document.createElement('img');
            image.className = 'receipt-image';
            image.src = imageSrc;
            image.alt = 'Comprobante de pago';
            image.style.cssText = 'width: 50px; height: 50px; object-fit: cover; cursor: pointer;';

            const menu = document.createElement('div');
            menu.className = 'receipt-menu';
            menu.style.cssText = 'display: none; position: absolute; top: 60px; left: 0; background: white; border: 1px solid #ccc; padding: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);';

            const changeBtn = document.createElement('button');
            changeBtn.textContent = 'Agregar/Cambiar imagen';
            changeBtn.style.cssText = 'display: block; width: 100%; margin: 2px 0;';
            
            // Crear el input file de manera persistente
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none';
            space.appendChild(fileInput);

            changeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                fileInput.click();
                menu.style.display = 'none';
            });

            fileInput.addEventListener('change', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const file = this.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        image.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            });

            const previewBtn = document.createElement('button');
            previewBtn.textContent = 'Vista previa';
            previewBtn.style.cssText = 'display: block; width: 100%; margin: 2px 0;';
            previewBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                showReceiptPreview(image.src, subscription, existingMember);
                menu.style.display = 'none';
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Eliminar imagen';
            deleteBtn.style.cssText = 'display: block; width: 100%; margin: 2px 0;';
            deleteBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const spaces = form.querySelector('.receipt-spaces');
                if (spaces.children.length > 1) {
                    space.remove();
                } else {
                    image.src = 'default-receipt.png';
                }
                menu.style.display = 'none';
            });

            menu.appendChild(changeBtn);
            menu.appendChild(previewBtn);
            menu.appendChild(deleteBtn);

            image.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
            });

            space.appendChild(image);
            space.appendChild(menu);

            // Cerrar el menú al hacer clic fuera
            document.addEventListener('click', function(e) {
                if (!space.contains(e.target)) {
                    menu.style.display = 'none';
                }
            });

            return space;
        }

        // Agregar espacios de recibo existentes o uno por defecto
        const receiptSpaces = form.querySelector('.receipt-spaces');
        if (existingMember?.receiptImages?.length) {
            existingMember.receiptImages.forEach(src => {
                receiptSpaces.appendChild(createReceiptSpace(src));
            });
        } else {
            receiptSpaces.appendChild(createReceiptSpace());
        }

        // Configurar el botón de agregar recibo
        const addReceiptButton = form.querySelector('.add-receipt-button');
        addReceiptButton.onclick = (e) => {
            e.preventDefault(); // Evitar el comportamiento por defecto
            const newReceiptSpace = createReceiptSpace();
            receiptSpaces.appendChild(newReceiptSpace);
        };

        // Configurar la funcionalidad de comentarios
        const commentsList = form.querySelector('.comments-list');
        const newCommentInput = form.querySelector('#new-comment');
        const addCommentButton = form.querySelector('.add-comment-button');

        // Función para crear un elemento de comentario
        function createCommentElement(commentText, index) {
            const commentDiv = document.createElement('div');
            commentDiv.className = 'comment-item';
            
            const commentContent = document.createElement('div');
            commentContent.className = 'comment-content';
            
            const textSpan = document.createElement('span');
            textSpan.className = 'comment-text';
            textSpan.textContent = commentText;
            
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'comment-buttons';
            
            const editButton = document.createElement('button');
            editButton.className = 'edit-comment-button';
            editButton.innerHTML = '✏️';
            editButton.onclick = () => {
                const newText = prompt('Editar comentario:', commentText);
                if (newText !== null && newText.trim() !== '') {
                    textSpan.textContent = newText.trim();
                    if (existingMember) {
                        existingMember.comments[index] = newText.trim();
                    } else {
                        subscription.tempComments[index] = newText.trim();
                    }
                }
            };
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-comment-button';
            deleteButton.innerHTML = '🗑️';
            deleteButton.onclick = () => {
                if (confirm('¿Estás seguro de que deseas eliminar este comentario?')) {
                    commentDiv.remove();
                    if (existingMember) {
                        existingMember.comments.splice(index, 1);
                    } else {
                        subscription.tempComments.splice(index, 1);
                    }
                }
            };
            
            buttonsDiv.appendChild(editButton);
            buttonsDiv.appendChild(deleteButton);
            
            commentContent.appendChild(textSpan);
            commentContent.appendChild(buttonsDiv);
            commentDiv.appendChild(commentContent);
            
            return commentDiv;
        }

        // Inicializar los comentarios
        if (!existingMember) {
            subscription.tempComments = subscription.tempComments || [];
        } else {
            existingMember.comments = existingMember.comments || [];
        }

        // Mostrar comentarios existentes
        const comments = existingMember ? existingMember.comments : subscription.tempComments;
        comments.forEach((comment, index) => {
            commentsList.appendChild(createCommentElement(comment, index));
        });

        // Configurar el botón de agregar comentario
        addCommentButton.onclick = () => {
            const commentText = newCommentInput.value.trim();
            if (commentText) {
                const comments = existingMember ? existingMember.comments : subscription.tempComments;
                comments.push(commentText);
                commentsList.appendChild(createCommentElement(commentText, comments.length - 1));
                newCommentInput.value = '';
            }
        };

        // Permitir enviar con Enter en el textarea
        newCommentInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addCommentButton.click();
            }
        });

        // Configurar el evento submit del formulario
        form.onsubmit = async (e) => {
            e.preventDefault();
            
            const receiptImages = Array.from(form.querySelectorAll('.receipt-image'))
                .map(img => img.src)
                .filter(src => src !== 'default-receipt.png' && !src.endsWith('default-receipt.png'));
            
            const memberData = {
                name: document.getElementById('memberName').value,
                payment: parseFloat(document.getElementById('memberPayment').value),
                frequency: document.getElementById('paymentFrequency').value,
                paymentPeriod: document.querySelector('input[name="paymentPeriod"]:checked')?.value,
                paymentMethods: Array.from(document.querySelectorAll('.payment-methods input:checked')).map(cb => cb.value),
                isPaid: document.querySelector('input[value="paid"]').checked,
                receiptImages: receiptImages,
                comments: existingMember ? existingMember.comments : subscription.tempComments || []
            };

            if (memberData.paymentPeriod === 'custom') {
                memberData.selectedMonths = Array.from(document.querySelectorAll('#monthsSelection input:checked')).map(cb => cb.value);
            }

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

            try {
                await dbOperations.updateSubscription(subscription);
                subscriptions = await dbOperations.getAllSubscriptions();
                showDetails(subscription);
            } catch (error) {
                console.error('Error al guardar el miembro:', error);
                alert('Hubo un error al guardar el miembro');
            }
        };

        // Configurar el botón de cancelar
        form.querySelector('.cancel-button').onclick = () => {
            showDetails(subscription);
        };

        // Configurar eventos para el período de pago
        const radioButtons = form.querySelectorAll('input[name="paymentPeriod"]');
        const monthsSelection = form.querySelector('#monthsSelection');
        
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                monthsSelection.style.display = e.target.value === 'custom' ? 'flex' : 'none';
            });
        });

        // Mostrar la selección de meses si es necesario
        if (existingMember?.paymentPeriod === 'custom') {
            monthsSelection.style.display = 'flex';
        }

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

    // Función para mostrar la vista previa del comprobante
    function showReceiptPreview(imageSrc, subscription, existingMember) {
        const previewCard = document.createElement('div');
        previewCard.className = 'preview-card';

        const previewImage = document.createElement('img');
        previewImage.className = 'preview-image';
        previewImage.src = imageSrc;
        previewImage.alt = 'Vista previa del comprobante';

        const backButton = document.createElement('button');
        backButton.textContent = 'Regresar';
        backButton.className = 'back-button';
        backButton.onclick = () => {
            app.innerHTML = '';
            showMemberForm(subscription, existingMember || {});
        };

        previewCard.appendChild(previewImage);
        previewCard.appendChild(backButton);
        app.innerHTML = '';
        app.appendChild(previewCard);
    }

    // Función para verificar el estado de la conexión
    function checkConnectivity() {
        const statusDiv = document.createElement('div');
        statusDiv.id = 'connection-status';
        statusDiv.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 1000;
        `;
        document.body.appendChild(statusDiv);

        function updateOnlineStatus() {
            const isOnline = navigator.onLine;
            statusDiv.style.backgroundColor = isOnline ? '#4CAF50' : '#f44336';
            statusDiv.textContent = isOnline ? '🌐 Online' : '📴 Offline';
            
            console.log('Estado de la aplicación:', {
                online: isOnline,
                serviceWorker: 'serviceWorker' in navigator ? 'Soportado' : 'No soportado',
                cache: 'caches' in window ? 'Disponible' : 'No disponible',
                indexedDB: 'indexedDB' in window ? 'Disponible' : 'No disponible'
            });
        }

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus();

        // Verificar Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                console.log('Service Worker listo:', registration.active ? 'Activo' : 'Inactivo');
            });
        }

        // Verificar Cache
        if ('caches' in window) {
            caches.keys().then(cacheNames => {
                console.log('Caches disponibles:', cacheNames);
                cacheNames.forEach(cacheName => {
                    caches.open(cacheName).then(cache => {
                        cache.keys().then(requests => {
                            console.log(`Archivos en cache ${cacheName}:`, requests.map(req => req.url));
                        });
                    });
                });
            });
        }

        // Verificar IndexedDB
        if (db) {
            const transaction = db.transaction(['subscriptions'], 'readonly');
            const store = transaction.objectStore('subscriptions');
            const request = store.count();
            request.onsuccess = () => {
                console.log('Número de suscripciones en IndexedDB:', request.result);
            };
        }
    }

    displaySubscriptions();
});